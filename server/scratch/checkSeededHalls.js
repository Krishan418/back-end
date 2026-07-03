import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import WeddingHall from '../models/weddingHall.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const halls = await WeddingHall.find();
  console.log("SEEDED HALLS IN DB:");
  halls.forEach(h => {
    console.log(`- Name: ${h.hallName}, Type: ${h.type}, Location: ${h.location}, Price: ${h.price}`);
  });
  process.exit(0);
};
run();
