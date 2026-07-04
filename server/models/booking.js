import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
	{
		room: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Room',
			required: [true, 'Room is required']
		},
		roomNumber: {
			type: String,
			required: [true, 'Room number is required']
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null
		},
		fullName: {
			type: String,
			required: [true, 'Full name is required'],
			trim: true
		},
		email: {
			type: String,
			required: [true, 'Email is required'],
			lowercase: true,
			trim: true,
			match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/
		},
		phone: {
			type: String,
			trim: true,
			default: ''
		},
		guests: {
			type: Number,
			required: [true, 'Guests count is required'],
			min: [1, 'Guests must be at least 1']
		},
		checkInDate: {
			type: Date,
			required: [true, 'Check-in date is required']
		},
		checkOutDate: {
			type: Date,
			required: [true, 'Check-out date is required']
		},
		nights: {
			type: Number,
			required: true,
			min: [1, 'Nights must be at least 1']
		},
		totalPrice: {
			type: Number,
			required: true,
			min: [0, 'Total price cannot be negative']
		},
		status: {
			type: String,
			enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
			default: 'pending'
		},
		paymentStatus: {
			type: String,
			enum: ['Pending', 'Paid', 'Cancelled'],
			default: 'Pending'
		},
		paymentMethod: {
			type: String,
			enum: ['Cash', 'Card', 'Online'],
			default: 'Cash'
		},
		specialRequests: {
			type: String,
			trim: true,
			default: ''
		},
		decorationItems: {
			type: [String],
			default: []
		},
		checkInType: {
			type: String,
			enum: ['Day', 'Night'],
			default: 'Day'
		},
		checkOutType: {
			type: String,
			enum: ['Day', 'Night'],
			default: 'Night'
		},
		startIndex: {
			type: Number,
			required: true
		},
		endIndex: {
			type: Number,
			required: true
		}
	},
	{
		timestamps: true
	}
);

bookingSchema.index({ email: 1, createdAt: -1 });
bookingSchema.index({ room: 1, startIndex: 1, endIndex: 1 });
bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });

export default mongoose.model('Booking', bookingSchema);
