import mongoose from 'mongoose';

// This schema stores booking transactions.
// It maps directly to the requested `weddingBookings` collection.
const weddingBookingSchema = new mongoose.Schema(
    {
        // Date and Time of the wedding/event
        eventDate: {
            type: Date,
            required: [true, 'Event date is required']
        },
        startTime: {
            type: String,
            required: [true, 'Start time is required']
        },
        endTime: {
            type: String,
            required: [true, 'End time is required']
        },

        // Event Categorization
        eventType: {
            type: String,
            enum: ['Wedding', 'Engagement', 'Reception', 'Other'],
            required: [true, 'Event type is required']
        },

        // Reference to the hall and customer
        hallId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WeddingHall',
            required: [true, 'Hall ID is required']
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Customer ID is required']
        },

        // Catering & Services
        packageType: {
            type: String,
            enum: ['Silver', 'Gold', 'Platinum'],
            required: [true, 'Package type is required']
        },
        guestCount: {
            type: Number,
            required: [true, 'Guest count is required'],
            min: [1, 'Guest count must be at least 1']
        },
        optionalServices: {
            type: [String],
            default: []
        },
        specialRequests: {
            type: String,
            trim: true
        },
        seatingStyle: {
            type: String,
            enum: ['Banquet', 'Theater', 'U-Shape', 'Custom'],
            default: 'Banquet'
        },

        // Financial Tracking
        totalAmount: {
            type: Number,
            default: 0
        },
        paidAmount: {
            type: Number,
            default: 0
        },
        depositAmount: {
            type: Number,
            default: 0
        },

        // Status & Agreement
        bookingStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
            default: 'pending'
        },
        isAgreedToTerms: {
            type: Boolean,
            required: [true, 'Agreement to terms is required']
        }
    },
    {
        // Keep createdAt and updatedAt automatically.
        timestamps: true,

        // Force the exact MongoDB collection name requested by you.
        collection: 'weddingBookings'
    }
);

// Helpful index to speed up availability checks by date + hall.
weddingBookingSchema.index({ eventDate: 1, hallId: 1 });

export default mongoose.model('WeddingBooking', weddingBookingSchema);
