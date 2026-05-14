import StockLog from "../models/StockLog.js";
import Inventory from "../models/inventory.js";

// Issue stock for a specific department (e.g., Morning Allocation)
export const issueStock = async (req, res) => {
  try {
    const { itemId, department, quantity, notes } = req.body;

    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem) return res.status(404).json({ message: "Inventory item not found" });

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock in main store" });
    }

    const log = await StockLog.create({
      item: itemId,
      department,
      issuedQuantity: Number(quantity),
      notes,
      date: new Date()
    });

    inventoryItem.quantity -= Number(quantity);
    await inventoryItem.save();

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Settle stock returns (e.g., Evening Return)
export const settleStock = async (req, res) => {
  try {
    const { logId, returnedQuantity } = req.body;

    const log = await StockLog.findById(logId);
    if (!log) return res.status(404).json({ message: "Stock log not found" });

    if (log.status === "Settled") {
      return res.status(400).json({ message: "This log is already settled" });
    }

    const retQty = Number(returnedQuantity);
    if (retQty > log.issuedQuantity) {
      return res.status(400).json({ message: "Returned quantity cannot exceed issued quantity" });
    }

    log.returnedQuantity = retQty;
    log.usageQuantity = log.issuedQuantity - retQty;
    log.status = "Settled";
    await log.save();

    const inventoryItem = await Inventory.findById(log.item);
    if (inventoryItem) {
      inventoryItem.quantity += retQty;
      await inventoryItem.save();
    }

    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch stock logs with optional date and department filters
export const getStockLogs = async (req, res) => {
  try {
    const { date, department } = req.query;
    let query = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (department) {
      query.department = department;
    }

    const logs = await StockLog.find(query)
      .populate("item", "itemName unit")
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
