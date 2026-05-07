import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import weddingRoutes from "./routes/weddingRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import poolBookingRoutes from "./routes/poolBookingRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import adminReportRoutes from "./routes/adminReportRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

// Security & parsing
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/auth', authLimiter);

app.get("/", (req, res) => {
  res.send("Hotel Management Backend Running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wedding", weddingRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pool-bookings", poolBookingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", adminReportRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, but keep the server alive if the database is unavailable.
try {
  await connectDB();
} catch (error) {
  console.warn("⚠️ Starting server without an active MongoDB connection.");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});