import mongoose from 'mongoose';

const poolBookingSchema = new mongoose.Schema(
    {
        guestName: {
            type: String,
            required: [true, 'Guest name is required'],
            trim: true
        },
        guestEmail: {
            type: String,
            required: [true, 'Guest email is required'],
            lowercase: true,
            trim: true,
            match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/
        },
        roomNumber: {
            type: String,
            trim: true,
            default: ''
        },
        date: {
            type: Date,
            required: [true, 'Booking date is required']
        },
        timeSlot: {
            type: String,
            required: [true, 'Time slot is required'],
            trim: true
        },
        numberOfGuests: {
            type: Number,
            required: [true, 'Number of guests is required'],
            min: [1, 'Number of guests must be at least 1']
        },
        status: {
            type: String,
            enum: ['Confirmed', 'Checked-In', 'Completed', 'Cancelled'],
            default: 'Confirmed'
        },
        pricePerPerson: {
            type: Number,
            required: [true, 'Price per person is required'],
            min: [0, 'Price per person cannot be negative']
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, 'Total amount cannot be negative']
        }
    },
    {
        timestamps: true
    }
);

poolBookingSchema.index({ date: 1, timeSlot: 1 });
poolBookingSchema.index({ guestEmail: 1, createdAt: -1 });

export default mongoose.model('PoolBooking', poolBookingSchema);