import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  hotelName: {
    type: String,
    required: true,
    default: 'Hotel Janro'
  },
  email: {
    type: String,
    required: true,
    default: 'info@hoteljanro.com'
  },
  address: {
    type: String,
    required: true,
    default: '123 Luxury Avenue, Paradise City, PC 10001'
  },
  phone: {
    type: String,
    required: true,
    default: '+1 (555) 123-4567'
  },
  website: {
    type: String,
    default: 'https://www.hoteljanro.com'
  },
  currency: {
    code: { type: String, default: 'LKR' },
    symbol: { type: String, default: 'Rs.' }
  },
  language: {
    type: String,
    default: 'English'
  },
  timezone: {
    type: String,
    default: 'UTC+05:30'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },
  notifications: {
    newBookings: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    lowInventory: { type: Boolean, default: true },
    staffUpdates: { type: Boolean, default: true }
  },
  bankAccounts: [{
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: { type: String, required: true },
    accountNumber: { type: String, required: true }
  }]
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
