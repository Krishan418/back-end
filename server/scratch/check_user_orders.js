import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import Order from "../models/order.js";

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoUri = process.env.MONGO_URI;
const isuruId = "69fc278e96cfa587cf03dbb2";

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const count = await Order.countDocuments({ customerUser: isuruId });
    console.log("Total orders for Isuru:", count);

    const orders = await Order.find({ customerUser: isuruId }).lean();
    console.log(orders);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
