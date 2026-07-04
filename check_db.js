import mongoose from 'mongoose';
import Booking from './server/models/booking.js';

mongoose.connect('mongodb://127.0.0.1:27017/hotel-booking-system')
  .then(async () => {
    const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(5);
    console.log(JSON.stringify(bookings, null, 2));
    mongoose.disconnect();
  });
