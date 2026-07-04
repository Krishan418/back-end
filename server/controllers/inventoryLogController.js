import StockLog from "../models/StockLog.js";
import Inventory from "../models/inventory.js";
import asyncHandler from "../middleware/asyncHandler.js";

// Issue stock for a specific department
export const issueStock = asyncHandler(async (req, res) => {
  const { itemId, department, quantity, notes } = req.body;

  const inventoryItem = await Inventory.findById(itemId);
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  if (inventoryItem.quantity < quantity) {
    res.status(400);
    throw new Error("Insufficient stock in main store");
  }

  const log = await StockLog.create({
    item: itemId,
    logType: "Issue",
    department,
    issuedQuantity: Number(quantity),
    notes,
    date: new Date()
  });

  inventoryItem.quantity -= Number(quantity);
  await inventoryItem.save();

  res.status(201).json(log);
});

// Settle stock returns
export const settleStock = asyncHandler(async (req, res) => {
  const { logId, returnedQuantity } = req.body;

  const log = await StockLog.findById(logId);
  if (!log) {
    res.status(404);
    throw new Error("Stock log not found");
  }

  if (log.status === "Settled") {
    res.status(400);
    throw new Error("This log is already settled");
  }

  const retQty = Number(returnedQuantity);
  if (retQty > log.issuedQuantity) {
    res.status(400);
    throw new Error("Returned quantity cannot exceed issued quantity");
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
});

// Restock main store
export const restockStock = asyncHandler(async (req, res) => {
  const { itemId, quantity, notes } = req.body;

  const inventoryItem = await Inventory.findById(itemId);
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    res.status(400);
    throw new Error("Please provide a valid quantity to restock");
  }

  const log = await StockLog.create({
    item: itemId,
    logType: "Restock",
    department: "Main Store",
    restockQuantity: qty,
    status: "Completed",
    notes,
    date: new Date()
  });

  inventoryItem.quantity += qty;
  await inventoryItem.save();

  res.status(201).json(log);
});

// Fetch stock logs with optional date and department filters
export const getStockLogs = asyncHandler(async (req, res) => {
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
});
