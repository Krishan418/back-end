import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const menuData = [
  // OUTDOOR PARTY MENU
  { name: "Devilled Chicken (Per Kg)", category: "Outdoor Party", price: 3300 },
  { name: "Chicken Black Curry (Per Kg)", category: "Outdoor Party", price: 3300 },
  { name: "Pork (Per Kg)", category: "Outdoor Party", price: 4600 },
  { name: "Prawns (Per Kg)", category: "Outdoor Party", price: 4650 },
  { name: "Cuttle Fish (Per Kg)", category: "Outdoor Party", price: 4850 },
  { name: "Crumb Fried Fish (Per Kg)", category: "Outdoor Party", price: 4800 },
  { name: "Sausages (Per Kg)", category: "Outdoor Party", price: 2850 },
  { name: "Potato Chips (Per Kg)", category: "Outdoor Party", price: 3600 },
  { name: "Hot Butter Mushrooms (Per Kg)", category: "Outdoor Party", price: 2850 },
  { name: "Vegetable Chopsy (Per Kg)", category: "Outdoor Party", price: 3150 },
  { name: "Chickpeas (Per Kg)", category: "Outdoor Party", price: 2150 },
  { name: "Boiled Vegetable (Per Kg)", category: "Outdoor Party", price: 3000 },
  { name: "Ice Cream (4L)", category: "Outdoor Party", price: 3500 },
  { name: "Power Charge (DJ/Band)", category: "Outdoor Party", price: 7500 },

  // RICE
  { name: "Mixed Fried Rice", category: "Rice", hasPortions: true, portions: [{ portionType: "Half", price: 1300 }, { portionType: "Full", price: 1650 }] },
  { name: "Seafood Rice", category: "Rice", hasPortions: true, portions: [{ portionType: "Half", price: 1200 }, { portionType: "Full", price: 1500 }] },
  { name: "Chicken Fried Rice", category: "Rice", hasPortions: true, portions: [{ portionType: "Half", price: 1100 }, { portionType: "Full", price: 1300 }] },
  { name: "Egg & Garlic Rice", category: "Rice", hasPortions: true, portions: [{ portionType: "Half", price: 800 }, { portionType: "Full", price: 1100 }] },
  { name: "Vegetable Fried Rice", category: "Rice", hasPortions: true, portions: [{ portionType: "Half", price: 800 }, { portionType: "Full", price: 900 }] },
  { name: "Nasi Goreng", category: "Rice", price: 1800 },
  { name: "Mongolian Rice", category: "Rice", price: 1800 },

  // CHOPSY RICE
  { name: "Seafood Chopsy Rice", category: "Rice", price: 1800 },
  { name: "Chicken Fried Chopsy Rice", category: "Rice", price: 1600 },
  { name: "Mixed Fried Chopsy Rice", category: "Rice", price: 2000 },
  { name: "Vegetable Fried Chopsy Rice", category: "Rice", price: 1300 },

  // KOTHTHU
  { name: "Mixed Koththu", category: "Koththu", price: 1650 },
  { name: "Cheese Koththu (Chicken)", category: "Koththu", price: 1500 },
  { name: "Chicken Koththu", category: "Koththu", price: 1300 },
  { name: "Egg / Cheese Koththu", category: "Koththu", hasPortions: true, portions: [{ portionType: "Half", price: 1100 }, { portionType: "Full", price: 1300 }] },

  // NOODLES
  { name: "Mixed Fried Noodles", category: "Noodles", price: 1450 },
  { name: "Chicken Fried Noodles", category: "Noodles", price: 1200 },
  { name: "Egg Fried Noodles", category: "Noodles", price: 900 },
  { name: "Seafood Noodles", category: "Noodles", price: 1300 },
  { name: "Vegetable Fried Noodles", category: "Noodles", price: 800 },

  // CUTTLE FISH
  { name: "Crispy Fried Cuttle Fish", category: "Cuttle Fish", price: 1800 },
  { name: "Hot Butter Cuttle Fish", category: "Cuttle Fish", price: 1800 },
  { name: "Devilled Fried Cuttle Fish", category: "Cuttle Fish", price: 1800 },
  { name: "Butter Cuttle Fish", category: "Cuttle Fish", price: 1800 },

  // CHICKEN DISHES
  { name: "Devilled / Fried Chicken", category: "Chicken", price: 1750 },
  { name: "Black Pepper Chicken", category: "Chicken", price: 1750 },
  { name: "Chicken Stew", category: "Chicken", price: 1750 },
  { name: "Hot Butter Chicken", category: "Chicken", price: 1750 },
  { name: "Chicken with Kankun", category: "Chicken", price: 1750 },
  { name: "Lemon Chicken", category: "Chicken", price: 1750 },
  { name: "Dry Chilli Cashew Chicken", category: "Chicken", price: 2750 },
  { name: "Sizzling Chicken", category: "Chicken", price: 2750 },

  // OMELET
  { name: "Sri Lankan Spicy Omelet", category: "Omelet", price: 750 },
  { name: "Chicken Omelet", category: "Omelet", price: 900 },
  { name: "Cheese Omelet", category: "Omelet", price: 950 },
  { name: "Prawns + Chicken Omelet", category: "Omelet", price: 1200 },
  { name: "Boiled Eggs (8 Nos)", category: "Omelet", price: 1250 },

  // MUTTON
  { name: "Mutton Black Pepper", category: "Mutton", price: 2200 }, // Added placeholder price as user left it blank
  { name: "Mutton Stew", category: "Mutton", price: 2200 }, // Placeholder
  { name: "Mutton Hot Kochchi", category: "Mutton", price: 2200 }, // Placeholder

  // PORK
  { name: "Pork Fried / Stew", category: "Pork", price: 2100 },
  { name: "Pork Black Pepper", category: "Pork", price: 2100 },
  { name: "Dry Chilli Pork", category: "Pork", price: 2100 },
  { name: "Devilled Pork", category: "Pork", price: 2100 },
  { name: "Pork 500g", category: "Pork", price: 2750 },

  // SOUP
  { name: "Vegetable Soup", category: "Soup", price: 300 },
  { name: "Cream of Chicken Soup", category: "Soup", price: 400 },
  { name: "Chicken & Corn Soup", category: "Soup", price: 450 },

  // SALAD
  { name: "Sri Lankan Onion Salad", category: "Salad", price: 800 },
  { name: "Mixed Salad", category: "Salad", price: 1650 },
  { name: "Cucumber & Tomato Salad", category: "Salad", price: 900 },
  { name: "Chef Seafood Salad", category: "Salad", price: 2600 },
  { name: "Vegetable/Chef Salad", category: "Salad", price: 1900 },
  { name: "Cucumber Salad", category: "Salad", price: 750 },

  // FISH (Thalapath)
  { name: "Fried Fish", category: "Fish", price: 1950 },
  { name: "Crumb Fried Fish with Chips", category: "Fish", price: 1950 },
  { name: "Fish Stew / Devilled", category: "Fish", price: 1950 },
  { name: "Hot Butter Fish", category: "Fish", price: 1950 },
  { name: "Hot Garlic Fish", category: "Fish", price: 1950 },
  { name: "Sweet & Sour Fish", category: "Fish", price: 1950 },

  // PRAWNS
  { name: "Fried / Butter Prawns", category: "Prawns", price: 1800 },
  { name: "Devilled / Hot Butter Prawns", category: "Prawns", price: 1800 },
  { name: "Hot Kochchi Prawns", category: "Prawns", price: 1800 },
  { name: "Sizzling Prawns", category: "Prawns", price: 1800 },
  { name: "Egg White Chilli Prawns", category: "Prawns", price: 1800 },

  // VEGETABLE & SIDES
  { name: "Boiled Vegetable", category: "Vegetables & Sides", price: 1350 },
  { name: "Hot Butter Mushroom", category: "Vegetables & Sides", price: 1200 },
  { name: "Garlic Boiled / Fried", category: "Vegetables & Sides", price: 1000 },
  { name: "Fried Cashew Nut", category: "Vegetables & Sides", price: 2300 },
  { name: "French Fries", category: "Vegetables & Sides", price: 1200 },
  { name: "Vegetable Chopsy", category: "Vegetables & Sides", price: 1400 },

  // BEVERAGES
  { name: "Coca Cola (400ml-1.5L)", category: "Beverages", price: 400 }, // using average as not specified
  { name: "Sprite (400ml-1.5L)", category: "Beverages", price: 400 },
  { name: "Soda", category: "Beverages", price: 300 },
  { name: "Water (1L)", category: "Beverages", price: 220 },
  { name: "Ginger Ale", category: "Beverages", price: 280 },
  { name: "EGB", category: "Beverages", price: 350 },

  // STARTERS (500g)
  { name: "Starter Chicken (500g)", category: "Starters", price: 2600 },
  { name: "Starter Pork (500g)", category: "Starters", price: 2800 },
  { name: "Starter Prawns (500g)", category: "Starters", price: 3450 },
  { name: "Starter Fish with Salad (500g)", category: "Starters", price: 2800 },
  { name: "Starter Cuttle Fish (500g)", category: "Starters", price: 2250 },
  { name: "Starter Sausages (500g)", category: "Starters", price: 2450 },
  { name: "Starter Potato Chips (500g)", category: "Starters", price: 2000 },
  { name: "Starter Hot Butter Mushrooms (500g)", category: "Starters", price: 2450 },
  { name: "Starter Vegetable Chopsy (500g)", category: "Starters", price: 2350 },
  { name: "Starter Chickpeas (500g)", category: "Starters", price: 2500 },
  { name: "Starter Boiled Vegetable (500g)", category: "Starters", price: 2500 },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/hotel-janro";
    console.log("Connecting to", mongoUri);
    await mongoose.connect(mongoUri);

    console.log("Deleting old menu items...");
    await MenuItem.deleteMany({});

    console.log("Inserting new menu items...");
    await MenuItem.insertMany(menuData);

    console.log("Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
