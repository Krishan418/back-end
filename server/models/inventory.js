import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    thresholdLevel: { type: Number, default: 10 },
    unit: { type: String, default: "pcs" },
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);