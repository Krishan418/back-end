import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import User from "../models/user.js";

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoUri = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const users = await User.find().lean();
    console.log(`Total users in database: ${users.length}`);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}): Role: ${u.role}, ID: ${u._id}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
