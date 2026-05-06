import express from "express";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderTrends,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createOrder);
router.get("/", protect, getOrders);
router.get("/trends", protect, authorize("admin", "manager"), getOrderTrends);
router.put("/:id", protect, authorize("admin", "manager", "cashier"), updateOrderStatus);
router.delete("/:id", protect, authorize("admin"), deleteOrder);

export default router;