import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function seedImages() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/hotel-janro";
    console.log("Connecting to", mongoUri);
    await mongoose.connect(mongoUri);

    const items = await MenuItem.find({});
    console.log(`Found ${items.length} items. Updating images...`);

    let updatedCount = 0;
    for (const item of items) {
      // Map category to a relevant keyword for better placeholder images
      let keyword = "food,meal";
      if (item.category === "Rice") keyword = "fried+rice";
      else if (item.category === "Chicken") keyword = "chicken,meat";
      else if (item.category === "Pork") keyword = "pork,meat";
      else if (item.category === "Cuttle Fish") keyword = "cuttlefish,seafood";
      else if (item.category === "Mutton") keyword = "mutton,curry";
      else if (item.category === "Fish") keyword = "fried+fish,seafood";
      else if (item.category === "Prawns") keyword = "prawns,seafood";
      else if (item.category === "Noodles") keyword = "noodles";
      else if (item.category === "Beverages") keyword = "drinks,beverage";
      else if (item.category === "Salad") keyword = "salad";
      else if (item.category === "Soup") keyword = "soup";
      else if (item.category === "Omelet") keyword = "omelet,eggs";
      else if (item.category === "Vegetables & Sides") keyword = "vegetables,fries";
      
      // Use loremflickr for random images based on category keyword
      // Add random string to avoid browser caching the exact same image for same categories
      const randStr = Math.random().toString(36).substring(7);
      const randomImageUrl = `https://loremflickr.com/500/400/${keyword}?random=${item._id}`;
      
      item.image = randomImageUrl;
      await item.save();
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} items with placeholder images!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedImages();
