import mongoose from 'mongoose';

// This schema stores booking transactions.
// It maps directly to the requested `weddingBookings` collection.
const weddingBookingSchema = new mongoose.Schema(
    {
        // Date of the wedding/event for this booking.
        eventDate: {
            type: Date,
            required: [true, 'Event date is required']
        },

        // Reference to the hall document in `weddingHalls`.
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

        // Package selected by the customer.
        packageType: {
            type: String,
            required: [true, 'Package type is required'],
            trim: true
        },

        // Number of guests expected.
        guestCount: {
            type: Number,
            required: [true, 'Guest count is required'],
            min: [1, 'Guest count must be at least 1']
        },

        // Current workflow state of the booking.
        bookingStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
            default: 'pending'
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
