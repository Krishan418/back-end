import mongoose from 'mongoose';

// Wedding Booking Schema - stores all booking transactions
const weddingBookingSchema = new mongoose.Schema(
    {
        // Event details
        eventDate: { type: Date, required: [true, 'Event date is required'] },
        hallId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingHall', required: [true, 'Hall ID is required'] },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

        // Customer details
        customerName: { type: String, required: [true, 'Customer name is required'] },
        customerPhone: { type: String, required: [true, 'Customer phone is required'] },
        customerEmail: { type: String },
        customerNIC: { type: String },
        customerAddress: { type: String },

        // Wedding-specific fields
        groomName: { type: String },
        groomPhone: { type: String },
        brideName: { type: String },
        bridePhone: { type: String },
        nekathTimes: {
            poruwa: { type: String },
            teaTime: { type: String },
            lunchDinner: { type: String }
        },

        // Event configuration
        seatingStyle: { type: String, enum: ['Round Tables', 'Theater', 'U-Shape', 'Classroom', 'Cocktail'], default: 'Round Tables' },
        dietaryNotes: { type: String },
        corkageIncluded: { type: Boolean, default: false },
        bookingCategory: { type: String, enum: ['Wedding', 'Event'], default: 'Wedding' },
        venuePreference: { type: String, enum: ['Indoor', 'Outdoor'], default: 'Indoor' },
        eventType: { 
            type: String, 
            enum: [
                'Wedding', 'Wedding Reception', 'Homecoming', 'Engagement Ceremony', 
                'Birthday Party', 'Birthday Celebration', 'Anniversary Party', 
                'Puberty Ceremony', 'Corporate Meeting / Seminar', 'Conference / Workshop', 
                'Company Annual Party', 'Product Launch', 'Graduation Ceremony', 
                'School / Alumni Reunion', 'Musical Show / Concert', 'Other'
            ], 
            required: [true, 'Event type is required'] 
        },
        timeSlot: { type: String, enum: ['Day', 'Night'], default: 'Day' },
        startTime: { type: String, required: [true, 'Start time is required'] },
        endTime: { type: String, required: [true, 'End time is required'] },

        // Catering - Wedding packages OR Event individual meals
        cateringPackage: { type: String, enum: ['Silver', 'Gold', 'Platinum', 'Custom'], default: 'Custom' },
        customPackagePrice: { type: Number, default: 0 },
        customPackageNotes: { type: String, default: '' },
        selectedMeals: [{ type: String }],

        // Guest & services
        guestCount: { type: Number, required: [true, 'Guest count is required'], min: [1, 'Guest count must be at least 1'] },
        optionalServices: [{ type: String }],
        specialRequests: { type: String },

        // Financial
        discountPercentage: { type: Number, default: 0 },
        complimentaryItems: [{ type: String }],
        totalAmount: { type: Number, required: true, default: 0 },
        advancePaid: { type: Number, required: true, default: 0, min: [0, 'Advance payment cannot be negative'] },
        paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Fully Paid'], default: 'Pending' },

        // Booking workflow
        bookingStatus: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'rejected'], default: 'pending' }
    },
    {
        timestamps: true,
        collection: 'weddingBookings'
    }
);

// Index for fast availability lookups
weddingBookingSchema.index({ eventDate: 1, hallId: 1 });

export default mongoose.model('WeddingBooking', weddingBookingSchema);
