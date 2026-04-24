import Order from "../models/order.js";
import MenuItem from "../models/menuitem.js"; 
import Inventory from "../models/inventory.js";

// 1. Create a new order (Secure)
export const createOrder = async (req, res) => {
  try {
    const { 
      orderType, 
      items, 
      discount = 0,
      tableNumber,
      roomNumber,
      deliveryAddress,
      contactNumber
    } = req.body;

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const realMenuItem = await MenuItem.findById(item.menuItemId);
      
      if (!realMenuItem) {
        return res.status(404).json({ message: `Menu item not found (ID: ${item.menuItemId})` });
      }

      subtotal += realMenuItem.price * item.quantity;
      
      validatedItems.push({
        menuItemId: realMenuItem._id,
        name: realMenuItem.name,
        price: realMenuItem.price, 
        quantity: item.quantity,
      });

      // Deduction logic: Try to find matching inventory item by name
      // This assumes MenuItem name matches Inventory itemName
      await Inventory.findOneAndUpdate(
        { itemName: { $regex: new RegExp(`^${realMenuItem.name}$`, "i") } },
        { $inc: { quantity: -item.quantity } }
      );
    }

    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + tax - discount;

    const order = await Order.create({
      orderType,
      tableNumber,
      roomNumber,
      deliveryAddress,
      contactNumber,
      items: validatedItems,
      subtotal,
      tax,
      discount,
      totalAmount,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (getOrders, updateOrderStatus, deleteOrder remain same)

// 5. GET USAGE TRENDS (Analytics)
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
    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.orderStatus },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};