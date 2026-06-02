import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        enum: ['Cash', 'Card', 'Online'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // RoomBooking, WeddingBooking, Order ID
        refPath: 'onModel'
    },
    onModel: {
        type: String,
        required: true,
        enum: ['Booking', 'WeddingBooking', 'Order']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Payment', paymentSchema);
