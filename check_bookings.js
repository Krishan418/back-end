import mongoose from 'mongoose';
import Booking from './server/models/booking.js';
import User from './server/models/user.js';

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hotel_janro";

async function check() {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB!");

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
