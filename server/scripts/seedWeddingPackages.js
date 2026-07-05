import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import WeddingPackage from '../models/weddingPackage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set custom dns to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const packages = [
  {
    name: "Special Package (100 Pax)",
    type: "wedding",
    price: 4750,
    bites: "Basic bites selection included",
    inclusions: [
      "Poruwa Set & Setup", "Set Back decoration", "Decorated Traditional Oil Lamp", 
      "Entrance Arch decoration", "Beautiful Photo Locations", "Table Decorations", 
      "Cake Baskets for tables", "Registration / Cake / Milk Rice Table Setups", 
      "Premium LED Dancing Floor", "Two A/C Rooms for Dressing", "Astaka Customs", 
      "Jayamangala Gatha girls", "Traditional Piliganeem", "West Natum (Udarata)", 
      "Champagne / Kirikala ceremony"
    ]
  },
  {
    name: "Special Package (150 Pax)",
    type: "wedding",
    price: 4450,
    bites: "Free Bites: Chicken 15Kg, Sausages 5Kg, Kadala 4Kg, Hot Butter Mushroom 3Kg",
    inclusions: [
      "Poruwa Set & Setup", "Set Back decoration", "Decorated Traditional Oil Lamp", 
      "Entrance Arch decoration", "Beautiful Photo Locations", "Table Decorations", 
      "Cake Baskets for tables", "Registration / Cake / Milk Rice Table Setups", 
      "Premium LED Dancing Floor", "Two A/C Rooms for Dressing", "Astaka Customs", 
      "Jayamangala Gatha girls", "Traditional Piliganeem", "West Natum (Udarata)", 
      "Champagne / Kirikala ceremony"
    ]
  },
  {
    name: "Special Package (250 Pax)",
    type: "wedding",
    price: 3750,
    bites: "Free Bites: Chicken 18Kg, Sausages 10Kg, Kadala 4Kg",
    inclusions: [
      "Poruwa Set & Setup", "Set Back decoration", "Decorated Traditional Oil Lamp", 
      "Entrance Arch decoration", "Beautiful Photo Locations", "Table Decorations", 
      "Cake Baskets for tables", "Registration / Cake / Milk Rice Table Setups", 
      "Premium LED Dancing Floor", "Two A/C Rooms for Dressing", "Astaka Customs", 
      "Jayamangala Gatha girls", "Traditional Piliganeem", "West Natum (Udarata)", 
      "Champagne / Kirikala ceremony"
    ]
  },
  {
    name: "Event Menu I",
    type: "event",
    price: 2900,
    bites: "Standard banquet menu layout",
    inclusions: [
      "Welcome Drink", "Vegetable Rice", "White Rice", "Chicken Curry", 
      "Fish Ambultiyal", "Dhal Curry", "Brinjal Moju", "Vegetable Salad", 
      "Dry Fish", "Dry Chilli Kankun", "Ice Cream", "Jelly"
    ]
  },
  {
    name: "Event Menu II",
    type: "event",
    price: 2750,
    bites: "Premium event buffet menu selection",
    inclusions: [
      "Welcome Drink", "Vegetable Rice", "Egg Noodles", "Chilli Chicken", 
      "Devilled Fish", "Vegetable Chopsy", "Hot Butter Mushroom", 
      "Dry Chilli Kankun", "Ice Cream", "Jelly"
    ]
  }
];

export const seedWeddingPackages = async () => {
  try {
    const count = await WeddingPackage.countDocuments();
    if (count === 0) {
      console.log("No wedding packages found. Seeding initial packages...");
      await WeddingPackage.insertMany(packages);
      console.log("✅ Seeded initial wedding and event packages successfully!");
    } else {
      console.log("Wedding packages already seeded.");
    }
  } catch (error) {
    console.error("❌ Seeding packages failed:", error);
  }
};

// If run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runDirect = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found");
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    await seedWeddingPackages();
    process.exit(0);
  };
  runDirect();
}
