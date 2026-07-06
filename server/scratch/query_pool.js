import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PoolBooking from '../models/poolBooking.js';
import dns from 'dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB!");
  
  const bookings = await PoolBooking.find().sort({ createdAt: -1 });
  console.log("Total Bookings:", bookings.length);
  bookings.slice(0, 10).forEach(b => {
    console.log(`Name: ${b.guestName}, Date: ${b.date ? b.date.toISOString() : 'N/A'}, Slot: ${b.timeSlot}, Guests: ${b.numberOfGuests}, Status: ${b.status}, CreatedAt: ${b.createdAt.toISOString()}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
