import mongoose from "mongoose";

const gymPassSchema = new mongoose.Schema({
  passId: {
    type: String,
    required: true,
    unique: true
  },
  passType: {
    type: String,
    enum: ['Day Pass', 'Monthly Member'],
    required: true
  },
  guestName: {
    type: String,
    required: true
  },
  
  guestPhone: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    default: ''
  },
  qrCodeKey: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid'
  },
  validDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const GymPass = mongoose.model("GymPass", gymPassSchema);
export default GymPass;
