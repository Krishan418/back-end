import express from "express";
import { generatePayHereHash, handlePayHereNotification } from "../controllers/payhereController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Generate MD5 signature hash for launching PayHere modal (requires login)
router.post("/payhere-hash", protect, generatePayHereHash);

// Webhook listener for PayHere IPN callback (called by PayHere server)
router.post("/payhere-notify", handlePayHereNotification);

export default router;
