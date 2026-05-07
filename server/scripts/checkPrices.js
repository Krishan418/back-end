import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';
import Room from '../models/room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(['8.8.8.8', '8.8.4.4']);

const checkPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const rooms = await Room.find({ isActive: true });
    console.log('Current Active Rooms:');
    rooms.forEach(r => console.log(` - ${r.name}: Rs. ${r.price}`));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkPrices();
