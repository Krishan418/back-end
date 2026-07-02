import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/booking.js';
import User from './models/user.js';
import Room from './models/room.js'; // Added Room import
import dns from 'dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function check() {
  console.log("Connecting to MONGO_URI:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas!");

  const users = await User.find();
  console.log("\n--- USERS ---");
  users.forEach(u => {
    console.log(`ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
  });

  const bookings = await Booking.find().populate('room');
  console.log("\n--- BOOKINGS ---");
  bookings.forEach(b => {
    console.log(`ID: ${b._id}, UserRef: ${b.user}, Name: ${b.fullName}, Email: ${b.email}, Room: ${b.room?.name}, Status: ${b.status}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
