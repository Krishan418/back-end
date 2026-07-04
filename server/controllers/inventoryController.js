import Inventory from "../models/inventory.js";
import asyncHandler from "../middleware/asyncHandler.js";

// Get all inventory items
export const getInventory = asyncHandler(async (req, res) => {
  const items = await Inventory.find().sort({ createdAt: -1 }).lean();
  res.status(200).json(items);
});

// Create new inventory item
export const createInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.create(req.body);
  res.status(201).json(item);
});

// Update inventory item
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }
  res.status(200).json(item);
});

// Remove inventory item
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findByIdAndDelete(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }
  res.status(200).json({ message: "Inventory item deleted" });
});

// Get items with low stock levels
export const getLowStockItems = asyncHandler(async (req, res) => {
  const items = await Inventory.find({
    $expr: { $lte: ["$quantity", "$thresholdLevel"] }
  }).lean();
  res.status(200).json(items);
});

// Manual stock issue (Restaurant/Events)
export const issueStock = asyncHandler(async (req, res) => {
  const { items, purpose } = req.body; 

  await Promise.all(items.map(async (reqItem) => {
    const inventoryItem = await Inventory.findById(reqItem.id);
    
    if (!inventoryItem) {
      res.status(404);
      throw new Error(`Item ID ${reqItem.id} not found`);
    }
    if (inventoryItem.quantity < reqItem.qty) {
      res.status(400);
      throw new Error(`Insufficient stock for ${inventoryItem.itemName}`);
    }

    inventoryItem.quantity -= reqItem.qty;
    await inventoryItem.save();
  }));

  res.status(200).json({ message: `Stock issued successfully for ${purpose}` });
});

// Update stock counts at end of day
export const reconcileEndOfDay = asyncHandler(async (req, res) => {
  const { items } = req.body; 

  await Promise.all(items.map(async (reqItem) => {
    const inventoryItem = await Inventory.findById(reqItem.id);
    
    if (inventoryItem) {
      inventoryItem.quantity = reqItem.remainingQty;
      await inventoryItem.save();
    }
  }));

  res.status(200).json({ message: "End of day stock balanced successfully!" });
});