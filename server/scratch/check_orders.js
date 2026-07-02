import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import Order from "../models/order.js";

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoUri = process.env.MONGO_URI;
console.log("Connecting to MongoDB:", mongoUri);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const count = await Order.countDocuments();
    console.log("Total orders in database:", count);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10);
    console.log("Recent orders:");
    recentOrders.forEach(o => {
      console.log(`- Order #${o.orderNumber}: ${o.customerName}, Total: ${o.totalAmount}, Status: ${o.orderStatus}, Payment: ${o.paymentStatus}, Date: ${o.createdAt}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
