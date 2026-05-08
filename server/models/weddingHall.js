import mongoose from 'mongoose';

// This schema stores static hall information.
// It maps directly to the requested `weddingHalls` collection.
const weddingHallSchema = new mongoose.Schema(
    {
        // Display name of the hall (e.g., "Royal Grand Hall").
        hallName: {
            type: String,
            required: [true, 'Hall name is required'],
            trim: true
        },

        // Maximum number of guests this hall can handle.
        capacity: {
            type: Number,
            required: [true, 'Hall capacity is required'],
            min: [1, 'Capacity must be at least 1']
        },

        // Base booking price for this hall.
        price: {
            type: Number,
            required: [true, 'Hall price is required'],
            min: [0, 'Price cannot be negative']
        },

        // Venue type
        type: {
            type: String,
            enum: ['Hall', 'Event Area'],
            default: 'Hall'
        },

        // Operational status of the hall.
        // `available` means it can be booked.
        // `maintenance`/`unavailable` means it should not be booked.
        status: {
            type: String,
            enum: ['available', 'maintenance', 'unavailable', 'occupied'],
            default: 'available'
        }
    },
    {
        // Keep createdAt and updatedAt automatically.
        timestamps: true,

        // Force the exact MongoDB collection name requested by you.
        collection: 'weddingHalls'
    }
);

export default mongoose.model('WeddingHall', weddingHallSchema);
