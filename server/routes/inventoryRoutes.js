import express from "express";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
} from "../controllers/inventoryController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getInventory);
router.get("/low-stock", protect, authorize("admin", "manager"), getLowStockItems);
router.post("/", protect, authorize("admin", "manager"), createInventoryItem);
router.put("/:id", protect, authorize("admin", "manager"), updateInventoryItem);
router.delete("/:id", protect, authorize("admin"), deleteInventoryItem);

export default router;