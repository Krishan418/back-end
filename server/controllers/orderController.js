import Order from "../models/order.js";
import MenuItem from "../models/MenuItem.js"; 
import Inventory from "../models/inventory.js";

// 1. CREATE ORDER (With Inventory Integration)
export const createOrder = async (req, res) => {
  try {
    const { 
      orderType, items, discount = 0, tableNumber, 
      roomNumber, deliveryAddress, contactNumber 
    } = req.body;

    let subtotal = 0;
    const validatedItems = [];

    // Use Promise.all to fetch all menu items and handle inventory
    await Promise.all(items.map(async (item) => {
      const realMenuItem = await MenuItem.findById(item.menuItemId);
      
      if (!realMenuItem) {
        throw new Error(`Menu item not found (ID: ${item.menuItemId})`);
      }

      // If menu item is linked to inventory, check and deduct stock
      if (realMenuItem.inventoryItem) {
        const inventory = await Inventory.findById(realMenuItem.inventoryItem);
        if (inventory) {
          if (inventory.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${realMenuItem.name}. Available: ${inventory.quantity}`);
          }
          // Deduct stock
          inventory.quantity -= item.quantity;
          await inventory.save();
        }
      }

      subtotal += realMenuItem.price * item.quantity;
      
      validatedItems.push({
        menuItemId: realMenuItem._id,
        name: realMenuItem.name,
        price: realMenuItem.price, 
        quantity: item.quantity,
      });
    }));

    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = Number((subtotal + tax - discount).toFixed(2));

    const order = await Order.create({
      orderType, tableNumber, roomNumber, deliveryAddress, 
      contactNumber, items: validatedItems, subtotal, tax, discount, totalAmount,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 2. GET ALL ORDERS
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. UPDATE ORDER STATUS
export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.orderStatus },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. DELETE ORDER
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
    res.status(200).json(trends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};