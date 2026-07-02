import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import WeddingHall from '../models/weddingHall.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set custom dns to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const halls = [
  {
    hallName: "Royal Grand Hall",
    capacity: 450,
    price: 15000,
    location: "Main Building, Level 2",
    description: "Our magnificent Grand Ballroom is perfect for lavish weddings and gala events with crystal chandeliers and marble floors.",
    image: "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYWxscm9vbSUyMHdlZGRpbmclMjB2ZW51ZXxlbnwxfHx8fDE3NzI0ODIyNzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    type: "Hall",
    status: "available"
  },
  {
    hallName: "Garden Celebration Hall",
    capacity: 300,
    price: 10000,
    location: "Garden Wing, Ground Level",
    description: "Elegant indoor-outdoor style venue surrounded by landscaped gardens, ideal for receptions and wedding ceremonies.",
    image: "https://images.unsplash.com/photo-1764471444363-e6dc0f9773bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mZXJlbmNlJTIwaGFsbCUyMGNvcnBvcmF0ZSUyMGV2ZW50fGVufDF8fHx8MTc3MjQ4MjI2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    type: "Hall",
    status: "available"
  },
  {
    hallName: "Pearl Banquet Hall",
    capacity: 200,
    price: 8000,
    location: "East Wing, Level 1",
    description: "A stylish medium-sized banquet hall designed for intimate weddings, engagement functions, and private events.",
    image: "https://images.unsplash.com/photo-1762216444919-043cf813e4de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXJkZW4lMjBwYXJ0eSUyMG91dGRvb3IlMjBldmVudCUyMHZlbnVlfGVufDF8fHx8MTc3MjQ4MjI3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    type: "Hall",
    status: "available"
  },
  {
    hallName: "Golden Sunset Lawn",
    capacity: 600,
    price: 12000,
    location: "West Side Gardens",
    description: "Breathtaking outdoor lawn with a scenic view of the horizon, perfect for large wedding ceremonies and sunset receptions.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1080",
    type: "Event Area",
    status: "available"
  },
  {
    hallName: "Emerald Pool Terrace",
    capacity: 150,
    price: 9000,
    location: "Poolside Level",
    description: "A chic poolside terrace offering a sophisticated atmosphere for cocktail parties, engagement dinners, and small events.",
    image: "https://images.unsplash.com/photo-1566733971257-826502945d58?auto=format&fit=crop&q=80&w=1080",
    type: "Event Area",
    status: "available"
  },
  {
    hallName: "Starlight Rooftop",
    capacity: 100,
    price: 11000,
    location: "Executive Tower, Top Floor",
    description: "An exclusive rooftop venue with panoramic city views, ideal for modern weddings and private corporate celebrations.",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1080",
    type: "Event Area",
    status: "available"
  }
];

const seedHalls = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }
    
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for seeding...");
    
    // Optional: Clear existing halls to prevent duplicates
    await WeddingHall.deleteMany();
    console.log("Cleared existing halls.");
    
    await WeddingHall.insertMany(halls);
    console.log("✅ Seeded wedding halls and event areas successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedHalls();
