import Inventory from "../models/inventory.js";

export const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. DELETE ITEM
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Inventory item deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. GET LOW STOCK ITEMS (Alerts)
export const getLowStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ["$quantity", "$thresholdLevel"] }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};