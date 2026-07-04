import mongoose from 'mongoose';

const weddingPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['wedding', 'event'],
    default: 'wedding'
  },
  price: {
    type: Number,
    required: true
  },
  bites: {
    type: String,
    default: ''
  },
  inclusions: {
    type: [String],
    default: []
  }
}, { timestamps: true });

const WeddingPackage = mongoose.model('WeddingPackage', weddingPackageSchema);

export default WeddingPackage;
