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
            required: false
        },

        // Manual customer details for admin/reception entry
        customerName: {
            type: String,
            required: [true, 'Customer name is required']
        },
        customerPhone: {
            type: String,
            required: [true, 'Customer phone is required']
        },
        customerEmail: {
            type: String
        },

        bookingCategory: {
            type: String,
            enum: ['Wedding', 'Event'],
            default: 'Wedding'
        },
        venuePreference: {
            type: String,
            enum: ['Indoor', 'Outdoor'],
            default: 'Indoor'
        },
        eventType: {
            type: String,
            enum: ['Wedding', 'Engagement', 'Reception', 'Birthday Party', 'Anniversary', 'Corporate Meeting', 'Other'],
            required: [true, 'Event type is required']
        },
        timeSlot: {
            type: String,
            enum: ['Day', 'Night'],
            default: 'Day'
        },
        startTime: {
            type: String,
            required: [true, 'Start time is required']
        },
        endTime: {
            type: String,
            required: [true, 'End time is required']
        },

        // Package selected by the customer (for Weddings).
        cateringPackage: {
            type: String,
            enum: ['Silver', 'Gold', 'Platinum', 'Custom'],
            default: 'Custom'
        },

        // Individual meals selected (for Events)
        selectedMeals: [{
            type: String
        }],

        // Number of guests expected.
        guestCount: {
            type: Number,
            required: [true, 'Guest count is required'],
            min: [1, 'Guest count must be at least 1']
        },

        // Additional services selected
        optionalServices: [{
            type: String
        }],

        // Any special requests
        specialRequests: {
            type: String
        },

        // Total calculated price
        totalAmount: {
            type: Number,
            required: true,
            default: 0
        },

        // Advance payment made
        advancePaid: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Advance payment cannot be negative']
        },

        // Payment status
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Partially Paid', 'Fully Paid'],
            default: 'Pending'
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
