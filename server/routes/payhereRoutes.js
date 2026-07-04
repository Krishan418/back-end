import express from "express";
import { generatePayHereHash, handlePayHereNotification } from "../controllers/payhereController.js";
import { getAllPayments } from "../controllers/paymentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all payments (Admin only)
router.get("/", protect, authorize('admin'), getAllPayments);

// Generate MD5 signature hash for launching PayHere modal (requires login)
router.post("/payhere-hash", protect, generatePayHereHash);

// Webhook listener for PayHere IPN callback (called by PayHere server)
router.post("/payhere-notify", handlePayHereNotification);

export default router;
