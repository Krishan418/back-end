import Order from "../models/order.js";
import MenuItem from "../models/MenuItem.js";
import Inventory from "../models/inventory.js";
import Payment from "../models/payment.js";
import { broadcastEvent } from "../utils/socket.js";
import asyncHandler from "../middleware/asyncHandler.js";

// Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const {
    orderType, items, discount = 0, tableNumber,
    roomNumber, deliveryAddress, contactNumber, coordinates,
    customerName, customerUser
  } = req.body;

  let subtotal = 0;
  const validatedItems = [];

  // Validate each menu item sequentially to prevent unhandled promise rejections
  for (const item of items) {
    const realMenuItem = await MenuItem.findById(item.menuItemId);

    if (!realMenuItem) {
      res.status(404);
      throw new Error(`Menu item not found (ID: ${item.menuItemId}). It may have been deleted.`);
    }

    let itemPrice = realMenuItem.price;
    if (realMenuItem.hasPortions && item.portion) {
      const selectedPortion = realMenuItem.portions.find(p => p.portionType === item.portion);
      if (selectedPortion) {
        itemPrice = selectedPortion.price;
      }
    }

    subtotal += itemPrice * item.quantity;

    validatedItems.push({
      menuItemId: realMenuItem._id,
      name: realMenuItem.name,
      portion: item.portion || "",
      price: itemPrice,
      quantity: item.quantity,
    });
  }

  // Calculate final totals
  const finalSubtotal = req.body.subtotal || subtotal;
  const finalServiceCharge = req.body.serviceCharge || 0;
  const finalDeliveryFee = req.body.deliveryFee || 0;
  const finalTotalAmount = Number((finalSubtotal + finalServiceCharge + finalDeliveryFee - discount).toFixed(2));

  const orderNumber = req.body.orderNumber || `POS-${Date.now().toString().slice(-6)}`;

  // Auto-merge logic for Dine-in and Room orders
  if (orderType === "Dine-in" || orderType === "Room") {
    let query = {
      orderType,
      paymentStatus: { $ne: 'Paid' },
      orderStatus: { $nin: ['Completed', 'Cancelled'] }
    };
    
    if (orderType === "Dine-in" && tableNumber) {
      query.tableNumber = { $regex: new RegExp(`^${tableNumber.trim()}$`, 'i') };
    } else if (orderType === "Room" && roomNumber) {
      query.roomNumber = { $regex: new RegExp(`^${roomNumber.trim()}$`, 'i') };
    }

    if (query.tableNumber || query.roomNumber) {
      const existingOrder = await Order.findOne(query);

      if (existingOrder) {
        // Merge items
        existingOrder.items.push(...validatedItems);
        existingOrder.subtotal += finalSubtotal;
        
        if (finalServiceCharge > 0) existingOrder.serviceCharge += finalServiceCharge;
        if (finalDeliveryFee > 0) existingOrder.deliveryFee += finalDeliveryFee;
        if (discount > 0) existingOrder.discount += discount;
        
        existingOrder.totalAmount = Number((existingOrder.subtotal + existingOrder.serviceCharge + existingOrder.deliveryFee - existingOrder.discount).toFixed(2));
        existingOrder.balance = Math.max(0, existingOrder.totalAmount - (existingOrder.amountReceived || 0));

        await existingOrder.save();
        
        broadcastEvent("orderUpdated", existingOrder);
        return res.status(200).json(existingOrder);
      }
    }
  }

  // Save new order to database if no mergeable order exists
  const order = await Order.create({
    orderType, tableNumber, roomNumber, deliveryAddress,
    contactNumber, coordinates, customerName, customerUser,
    items: validatedItems,
    subtotal: finalSubtotal,
    serviceCharge: finalServiceCharge,
    deliveryFee: finalDeliveryFee,
    discount,
    totalAmount: finalTotalAmount,
    paymentStatus: req.body.paymentStatus || 'Unpaid',
    paymentMethod: req.body.paymentMethod || 'Other',
    amountReceived: req.body.amountReceived || 0,
    balance: req.body.balance || 0,
    orderNumber,
  });

  broadcastEvent("orderCreated", order);

  res.status(201).json(order);
});

// Get all orders
export const getOrders = asyncHandler(async (req, res) => {
  let query = {};

  // Filter by customer if not admin/staff
  if (req.user && !['admin', 'manager', 'cashier', 'reception', 'receptionist'].includes(req.user.role)) {
    query.customerUser = req.user._id;
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
  res.status(200).json(orders);
});

// Update order status or payment
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if the user is a customer
  const isStaff = ['admin', 'manager', 'cashier', 'reception', 'receptionist'].includes(req.user?.role);
  
  if (!isStaff) {
    // Check if it's their own order
    if (order.customerUser && order.customerUser.toString() !== req.user?._id.toString()) {
      res.status(403);
      throw new Error("You can only edit your own orders");
    }

    // Check the 5-minute limit (only for items update)
    if (req.body.items) {
      const diffInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
      if (diffInMinutes > 5) {
        res.status(400);
        throw new Error("Order cannot be edited after 5 minutes");
      }
      
      if (order.orderStatus !== 'Pending') {
        res.status(400);
        throw new Error("Only pending orders can be edited");
      }
    }

    // Restrict status updates for customers
    if (req.body.orderStatus && req.body.orderStatus !== order.orderStatus) {
      if (req.body.orderStatus !== 'Cancelled') {
        res.status(403);
        throw new Error("Customers can only cancel orders.");
      }
      if (order.orderStatus !== 'Pending') {
        res.status(400);
        throw new Error("Only pending orders can be cancelled.");
      }
    }
  }

  // Recalculate totals if items are changed (for BOTH staff and customers)
  if (req.body.items) {
    let subtotal = 0;
    const validatedItems = [];

    for (const item of req.body.items) {
      const realMenuItem = await MenuItem.findById(item.menuItemId);
      if (!realMenuItem) {
        res.status(404);
        throw new Error(`Menu item not found: ${item.menuItemId}`);
      }

      let itemPrice = realMenuItem.price;
      if (realMenuItem.hasPortions && item.portion) {
        const selectedPortion = realMenuItem.portions.find(p => p.portionType === item.portion);
        if (selectedPortion) itemPrice = selectedPortion.price;
      }

      subtotal += itemPrice * item.quantity;
      validatedItems.push({
        menuItemId: realMenuItem._id,
        name: realMenuItem.name,
        portion: item.portion || "",
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    req.body.items = validatedItems;
    req.body.subtotal = subtotal;
    
    // Recalculate totalAmount based on existing charges
    let serviceCharge = order.serviceCharge || 0;
    if (order.orderType === 'Dine-in' || order.orderType === 'Room') {
      serviceCharge = subtotal * 0.1;
    }
    req.body.serviceCharge = serviceCharge;
    
    const deliveryFee = order.deliveryFee || 0;
    const discount = order.discount || 0;
    req.body.totalAmount = Number((subtotal + serviceCharge + deliveryFee - discount).toFixed(2));
  }

  let updateData = { ...req.body };
  
  // Handle Split Payments logic
  if (req.body.splitPayment) {
    const { amount, method, note } = req.body.splitPayment;
    const paymentAmount = Number(amount);
    if (paymentAmount > 0) {
      const currentReceived = (order.amountReceived || 0) + paymentAmount;
      const totalAmount = order.totalAmount || 0;
      const newBalance = Math.max(totalAmount - currentReceived, 0);
      
      updateData.$push = {
        splitPayments: {
          amount: paymentAmount,
          method: method || 'Other',
          date: new Date(),
          note: note || ''
        }
      };
      
      updateData.$set = updateData.$set || {};
      updateData.$set.amountReceived = currentReceived;
      updateData.$set.balance = newBalance;
      
      if (currentReceived >= totalAmount) {
        updateData.$set.paymentStatus = 'Paid';
        updateData.$set.orderStatus = 'Completed';
      } else {
        updateData.$set.paymentStatus = 'Partial';
      }
      
      delete updateData.splitPayment;
    }
  }

  if (!updateData.$set) {
    updateData = { $set: updateData };
  } else {
    // Move any top-level properties into $set if they aren't MongoDB operators
    for (const key in updateData) {
      if (!key.startsWith('$') && key !== 'splitPayment') {
        updateData.$set[key] = updateData[key];
        delete updateData[key];
      }
    }
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    updateData,
    { returnDocument: 'after', runValidators: true }
  );

  // If local fallback just set it to Paid, create Payment log if it didn't exist
  if (updateData.$set && updateData.$set.paymentStatus === 'Paid' && order.paymentStatus !== 'Paid') {
    try {
      // Check if one already exists to avoid duplicates (e.g. if webhook fired)
      const existingPayment = await Payment.findOne({ referenceId: updatedOrder._id, status: 'Completed' });
      if (!existingPayment) {
        await Payment.create({
          amount: updatedOrder.totalAmount,
          method: updatedOrder.paymentMethod || 'Online',
          status: 'Completed',
          user: updatedOrder.customerUser || "000000000000000000000000",
          referenceId: updatedOrder._id,
          onModel: "Order"
        });
      }
    } catch (err) {
      console.error("Failed to create Payment log:", err);
    }
  }

  broadcastEvent("orderUpdated", updatedOrder);

  res.status(200).json(updatedOrder);
});

// Remove order
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  broadcastEvent("orderDeleted", { id: req.params.id });

  res.status(200).json({ message: "Order deleted successfully" });
});

// Get item popularity trends
export const getOrderTrends = asyncHandler(async (req, res) => {
  const trends = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 }
  ]);
  res.status(200).json(trends);
});

// Get sales analytics summary
export const getOrdersSummary = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user && !['admin', 'manager', 'cashier', 'reception', 'receptionist'].includes(req.user.role)) {
    query.customerUser = req.user._id;
  }

  const orders = await Order.find(query).lean();

  // Aggregate statistics
  const totalSales = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const completed = orders.filter(o => (o.orderStatus || '').toLowerCase() === 'completed').length;
  const pending = orders.filter(o => (o.orderStatus || '').toLowerCase() === 'pending').length;
  const cancelled = orders.filter(o => (o.orderStatus || '').toLowerCase() === 'cancelled').length;

  // Payment method breakdown
  const paymentMap = {};
  orders.forEach(o => {
    const m = o.paymentMethod || 'Other';
    paymentMap[m] = (paymentMap[m] || 0) + (o.totalAmount || 0);
  });

  const paymentBreakdown = Object.keys(paymentMap).map(k => ({ method: k, amount: paymentMap[k] }));

  res.status(200).json({
    success: true,
    data: {
      totalSales,
      completed,
      pending,
      cancelled,
      paymentBreakdown,
      recent: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8)
    }
  });
});
