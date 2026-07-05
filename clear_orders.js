import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './server/models/order.js';

// Load environment variables from the server folder
dotenv.config({ path: './server/.env' });

const clearTestOrders = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("No MONGO_URI found in server/.env");
      process.exit(1);
    }
    
    console.log("Connecting to database to clear test orders...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    // Delete all documents in the Order collection
    const result = await Order.deleteMany({});
    console.log(`===========================================`);
    console.log(`✅ Success: Deleted ${result.deletedCount} test orders!`);
    console.log(`===========================================`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error clearing orders:", error);
    process.exit(1);
  }
};

clearTestOrders();
