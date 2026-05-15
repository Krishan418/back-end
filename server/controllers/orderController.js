import Order from "../models/order.js";
import MenuItem from "../models/MenuItem.js";
import Inventory from "../models/inventory.js";

// Create new order
export const createOrder = async (req, res) => {
  try {
    const {
      orderType, items, discount = 0, tableNumber,
      roomNumber, deliveryAddress, contactNumber, coordinates,
      customerName, customerUser
    } = req.body;

    let subtotal = 0;
    const validatedItems = [];

    // Validate each menu item
    await Promise.all(items.map(async (item) => {
      const realMenuItem = await MenuItem.findById(item.menuItemId);

      if (!realMenuItem) {
        throw new Error(`Menu item not found (ID: ${item.menuItemId})`);
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
    }));

    // Calculate final totals
    const finalSubtotal = req.body.subtotal || subtotal;
    const finalServiceCharge = req.body.serviceCharge || 0;
    const finalDeliveryFee = req.body.deliveryFee || 0;
    const finalTotalAmount = Number((finalSubtotal + finalServiceCharge + finalDeliveryFee - discount).toFixed(2));

    const orderNumber = req.body.orderNumber || `POS-${Date.now().toString().slice(-6)}`;

    // Save order to database
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

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    let query = {};

    // Filter by customer if not admin/staff
    if (req.user && !['admin', 'manager', 'cashier', 'reception', 'receptionist'].includes(req.user.role)) {
      query.customerUser = req.user._id;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status or payment
export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove order
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get item popularity trends
export const getOrderTrends = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get sales analytics summary
export const getOrdersSummary = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
