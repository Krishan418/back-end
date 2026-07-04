import mongoose from 'mongoose';
import Booking from './models/booking.js';

mongoose.connect('mongodb+srv://kavindukrishan2002418_db_user:K12345678@cluster0.lyijvbw.mongodb.net/hotel_db?retryWrites=true&w=majority')
  .then(async () => {
    const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(1);
    console.log(JSON.stringify(bookings, null, 2));
    mongoose.disconnect();
  });
