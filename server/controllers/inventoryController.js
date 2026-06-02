import Inventory from "../models/inventory.js";

// Fetch all inventory items
export const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new inventory item
export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an existing inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an inventory item
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ message: "Inventory item deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get items that have reached or dropped below threshold
export const getLowStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ["$quantity", "$thresholdLevel"] }
    }).lean();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Issue stock for specific purposes (Restaurant/Wedding)
export const issueStock = async (req, res) => {
  try {
    const { items, purpose } = req.body; 

    await Promise.all(items.map(async (reqItem) => {
      const inventoryItem = await Inventory.findById(reqItem.id);
      
      if (!inventoryItem) throw new Error(`Item ID ${reqItem.id} not found`);
      if (inventoryItem.quantity < reqItem.qty) {
        throw new Error(`Insufficient stock for ${inventoryItem.itemName}`);
      }

      inventoryItem.quantity -= reqItem.qty;
      await inventoryItem.save();
    }));

    res.status(200).json({ message: `Stock issued successfully for ${purpose}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Reconcile remaining stock at the end of operations
export const reconcileEndOfDay = async (req, res) => {
  try {
    const { items } = req.body; 

    await Promise.all(items.map(async (reqItem) => {
      const inventoryItem = await Inventory.findById(reqItem.id);
      
      if (inventoryItem) {
        inventoryItem.quantity = reqItem.remainingQty;
        await inventoryItem.save();
      }
    }));

    res.status(200).json({ message: "End of day stock balanced successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};