import Inventory from "../models/inventory.js";

// 1. GET ALL INVENTORY
export const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. CREATE INVENTORY ITEM
export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. UPDATE INVENTORY ITEM
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

// 4. DELETE INVENTORY ITEM
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ message: "Inventory item deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. GET LOW STOCK ITEMS (Alerts)
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

// ==========================================
// NEW PERIODIC INVENTORY LOGIC
// ==========================================

// 6. ISSUE STOCK (Morning dispatch to Restaurant or Wedding)
export const issueStock = async (req, res) => {
  try {
    // req.body.items pattern: [{ id: "...", qty: 5 }]
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

// 7. END OF DAY RECONCILIATION (Night balance update)
export const reconcileEndOfDay = async (req, res) => {
  try {
    // req.body.items pattern: [{ id: "...", remainingQty: 3 }]
    const { items } = req.body; 

    await Promise.all(items.map(async (reqItem) => {
      const inventoryItem = await Inventory.findById(reqItem.id);
      
      if (inventoryItem) {
        // Sets the database quantity directly to the physical remaining quantity
        inventoryItem.quantity = reqItem.remainingQty;
        await inventoryItem.save();
      }
    }));

    res.status(200).json({ message: "End of day stock balanced successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};