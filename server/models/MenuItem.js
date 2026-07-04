import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      unique: true,
      index: true
    },
    category: { 
      type: String, 
      required: true, 
      trim: true,
      index: true   
    },
    price: { 
      type: Number, 
      required: function() { return !this.hasPortions; },
      min: [0, "Price cannot be negative"] 
    },
    hasPortions: {
      type: Boolean,
      default: false
    },
    portions: [
      {
        portionType: { type: String, required: true },
        price: { type: Number, min: 0, required: true }
      }
    ],
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
    description: { 
      type: String, 
      trim: true,
      default: "",
      maxlength: [500, "Description is too long"] 
    },
    image: { 
      type: String, 
      default: "" 
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      default: null
    },
    prepTime: {
      type: Number,
      default: 15
    }
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", menuItemSchema);