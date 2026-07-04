import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    item: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Inventory", 
      required: true 
    },
    department: { 
      type: String, 
      required: true,
      enum: ["Restaurant", "Weddings", "Pool", "Other"] 
    },
    issuedQuantity: { 
      type: Number, 
      required: true 
    },
    returnedQuantity: { 
      type: Number, 
      default: 0 
    },
    usageQuantity: { 
      type: Number, 
      default: 0 
    },
    date: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      enum: ["Issued", "Settled"], 
      default: "Issued" 
    },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("StockLog", stockLogSchema);
