import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      enum: ["Dine-in", "Room", "Delivery", "Take-away"],
      required: true,
    },
    tableNumber: { type: String }, 
    roomNumber: { type: String }, 
    deliveryAddress: { type: String }, 
    contactNumber: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    customerName: { type: String },
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    items: [
      {
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
        name: { type: String, required: true },
        portion: { type: String, default: "" }, // Store "Full", "Half", or empty
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Other' },
    orderNumber: { type: String, index: true },
    orderStatus: {
      type: String,
      enum: ["Pending", "Preparing", "Completed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
    amountReceived: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);