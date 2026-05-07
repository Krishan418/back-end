import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';

// Load .env from the server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const clearBookings = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found in env');
        
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Dynamically get the Booking model
        const bookingSchema = new mongoose.Schema({}, { strict: false });
        const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

        const result = await Booking.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} booking(s).`);

        process.exit(0);
    } catch (error) {
        console.error('Error clearing bookings:', error.message);
        process.exit(1);
    }
};

clearBookings();
