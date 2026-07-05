import express from "express";
import {
  createOrder,
  getOrders,
  getOrdersSummary,
  updateOrderStatus,
  deleteOrder,
  abandonOrder,
  getOrderTrends,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

import rateLimit from 'express-rate-limit';

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 25,//Max 25 orders per IP per 10 mins
  message: { message: "Too many orders from this IP. Please wait before ordering again." }
});

const router = express.Router();

router.post("/", orderLimiter, createOrder);
router.get("/", protect, getOrders);
router.get("/summary", protect, authorize("admin", "manager", "cashier"), getOrdersSummary);
router.get("/trends", protect, authorize("admin", "manager"), getOrderTrends);
router.put("/:id", protect, authorize("admin", "manager", "cashier", "customer"), updateOrderStatus);
router.delete("/:id/abandon", abandonOrder); // No auth needed, relies on unguessable ID + exact state
router.delete("/:id", protect, authorize("admin"), deleteOrder);

export default router;