import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import dns from "dns";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import weddingRoutes from "./routes/weddingRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import poolBookingRoutes from "./routes/poolBookingRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

app.use(cors());
app.use(express.json());

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