import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    item: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Inventory", 
      required: true 
    },
    logType: {
      type: String,
      enum: ["Issue", "Restock"],
      default: "Issue",
      required: true
    },
    department: { 
      type: String, 
      enum: ["Restaurant Kitchen", "Wedding Kitchen", "Main Store"],
      required: function() { return this.logType === 'Issue'; }
    },
    issuedQuantity: { 
      type: Number, 
      default: 0 
    },
    restockQuantity: {
      type: Number,
      default: 0
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
      enum: ["Issued", "Settled", "Completed"], 
      default: "Issued" 
    },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("StockLog", stockLogSchema);
