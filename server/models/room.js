//Defines the structure of how Room data is stored in the MongoDB database.


import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Room name is required'],
			trim: true
		},
		description: {
			type: String,
			required: [true, 'Room description is required'],
			trim: true
		},
		price: {
			type: Number,
			required: [true, 'Room price is required'],
			min: [0, 'Price cannot be negative']
		},
		availableRooms: {
			type: Number,
			required: [true, 'Available rooms count is required'],
			min: [0, 'Available rooms cannot be negative'],
			default: 0
		},
		totalRooms: {
			type: Number,
			required: [true, 'Total rooms count is required'],
			min: [0, 'Total rooms cannot be negative'],
			default: 1
		},
		occupancyText: {
			type: String,
			trim: true
		},
		defaultGuests: {
			type: Number,
			min: [1, 'Default guests must be at least 1'],
			default: 1
		},
		image: {
			type: String,
			trim: true
		},
		amenities: {
			type: [String],
			default: []
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true
	}
);

export default mongoose.model('Room', roomSchema);
