import mongoose from "mongoose";

export const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_FALLBACK_URI || "mongodb://127.0.0.1:27017/hotel_janro";

  const connectWithUri = async (mongoUri) => {
    console.log(`🔄 Attempting to connect to MongoDB: ${mongoUri.startsWith("mongodb+srv://") ? "Atlas" : "local"}`);
    return mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
  };

  try {
    const conn = await connectWithUri(primaryUri || fallbackUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch(error) {
    if (primaryUri && primaryUri !== fallbackUri) {
      console.warn("⚠️ Primary MongoDB connection failed, trying local fallback...");

      try {
        const fallbackConn = await connectWithUri(fallbackUri);
        console.log(`✅ MongoDB Connected: ${fallbackConn.connection.host}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error("❌ MongoDB Connection Error:", fallbackError.message);
        throw fallbackError;
      }
    }

    console.error("❌ MongoDB Connection Error:", error.message);
    throw error; // Throw so startServer can catch and exit
  }
};
