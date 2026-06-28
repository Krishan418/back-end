import mongoose from 'mongoose';

// Wedding Hall Schema - stores venue/hall information
const weddingHallSchema = new mongoose.Schema(
    {
        hallName: {
            type: String,
            required: [true, 'Hall name is required'],
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        capacity: {
            type: Number,
            required: [true, 'Hall capacity is required'],
            min: [1, 'Capacity must be at least 1']
        },
        price: {
            type: Number,
            required: [true, 'Hall price is required'],
            min: [0, 'Price cannot be negative']
        },
        type: {
            type: String,
            enum: ['Hall', 'Event Area'],
            default: 'Hall'
        },
        status: {
            type: String,
            enum: ['available', 'maintenance', 'unavailable', 'occupied'],
            default: 'available'
        },
        image: {
            type: String,
            default: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'
        }
    },
    {
        timestamps: true,
        collection: 'weddingHalls'
    }
);

export default mongoose.model('WeddingHall', weddingHallSchema);
