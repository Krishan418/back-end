import Booking from '../models/booking.js';
import Room from '../models/room.js';
import {
	CANCELLABLE_BY_USER,
	isValidStatusTransition,
	sanitizeDecorationItems,
	calculateDecorationTotal
} from './roombookinghekpers.js';

export const createBooking = async (req, res) => {
	try {
		// New booking create.
		const {
			roomId,
			checkInDate,
			checkOutDate,
			guests,
			fullName,
			email,
			phone,
			specialRequests,
			decorationItems,
			checkInType,
			checkOutType,
			stayMode
		} = req.body;

		//Required Fields Validation
		if (!roomId || !checkInDate || !checkOutDate || !guests || !fullName || !email) {
			return res.status(400).json({
				success: false,
				message: 'Missing required booking fields'
			});
		}

		// Lock/check room inside transaction so availability stays consistent.
		const room = await Room.findById(roomId);
		if (!room || !room.isActive) {
			return res.status(404).json({
				success: false,
				message: 'Room not found'
			});
		}

		// Calculate total slots (Day=0, Night=1)
		// Day = date * 2, Night = date * 2 + 1
		const startMs = new Date(checkInDate).getTime();
		const startIndex = (Math.floor(startMs / (1000 * 60 * 60 * 24)) * 2) + (checkInType === 'Night' ? 1 : 0);

		let endIndex, slots;
		if (stayMode === 'onlyDay' || stayMode === 'onlyNight') {
			// Single-period stays: exactly 1 slot, endIndex = startIndex
			endIndex = startIndex;
			slots = 1;
		} else {
			// Custom multi-day calculation
			const endMs = new Date(checkOutDate).getTime();
			endIndex = (Math.floor(endMs / (1000 * 60 * 60 * 24)) * 2) + (checkOutType === 'Night' ? 1 : 0);
			slots = Math.max(1, endIndex - startIndex + 1);
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const overlapOrConditions = [{ email: normalizedEmail }];
		if (req.user?._id) {
			overlapOrConditions.push({ user: req.user._id });
		}

		// 1. Prevent duplicate overlapping bookings for SAME USER/EMAIL.
		const userDuplicate = await Booking.findOne({
			room: room._id,
			status: { $ne: 'cancelled' },
			startIndex: { $lte: endIndex },
			endIndex: { $gte: startIndex },
			$or: overlapOrConditions
		});

		if (userDuplicate) {
			return res.status(409).json({
				success: false,
				message: 'You already have an overlapping booking for these dates'
			});
		}

		// 2. Check ROOM CAPACITY for these specific slots.
		const overlappingBookings = await Booking.find({
			room: room._id,
			status: { $ne: 'cancelled' },
			startIndex: { $lte: endIndex },
			endIndex: { $gte: startIndex }
		});

		// Count occupancy for each slot in the requested range
		for (let s = startIndex; s <= endIndex; s++) {
			const occupancy = overlappingBookings.filter(b => b.startIndex <= s && b.endIndex >= s).length;
			if (occupancy >= (room.totalRooms || 1)) {
				return res.status(400).json({
					success: false,
					message: `Room is fully booked for some of the selected dates/times`
				});
			}
		}

		// When the booking is confirmed, reduce the available room count.
		if (room.availableRooms > 0) {
			room.availableRooms -= 1;
			await room.save();
		}

		// Decorations are allowed only for honeymoon room types.
		const supportsDecorations = String(room.name || '').toLowerCase().includes('honeymoon');
		const sanitizedDecorationItems = supportsDecorations ? sanitizeDecorationItems(decorationItems) : [];
		const decorationTotal = calculateDecorationTotal(sanitizedDecorationItems);

		// Price calculation logic: (Base Price * Slots) + Decoration Total
		const totalPrice = (room.price * slots) + decorationTotal;

		//Save in the booking database.
		const booking = await Booking.create({
			room: room._id,
			user: req.user?._id || null,
			fullName,
			email: normalizedEmail,
			phone,
			guests,
			checkInDate,
			checkOutDate,
			nights: slots,
			totalPrice,
			specialRequests,
			decorationItems: sanitizedDecorationItems,
			checkInType: checkInType || 'Day',
			checkOutType: checkOutType || 'Night',
			startIndex,
			endIndex
		});

		const populatedBooking = await Booking.findById(booking._id).populate('room', 'name price image');

		res.status(201).json({
			success: true,
			data: populatedBooking
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const updateBookingStatus = async (req, res) => {
	try {
		const { status } = req.body;
		// Restrict status updates to known values.
		const allowedStatuses = ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];

		if (!allowedStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
			});
		}

		const booking = await Booking.findById(req.params.id);
		if (!booking) {
			return res.status(404).json({
				success: false,
				message: 'Booking not found'
			});
		}

		if (!isValidStatusTransition(booking.status, status)) {
			return res.status(400).json({
				success: false,
				message: `Invalid status transition: ${booking.status} -> ${status}`
			});
		}

		const room = await Room.findById(booking.room);
		if (!room) {
			return res.status(404).json({
				success: false,
				message: 'Associated room not found'
			});
		}

		// Return room slot when a booking is cancelled.
		if (booking.status !== 'cancelled' && status === 'cancelled') {
			room.availableRooms += 1;
			await room.save();
		}

		// Consume a room slot if reactivating a cancelled booking.
		if (booking.status === 'cancelled' && status !== 'cancelled') {
			if (room.availableRooms < 1) {
				return res.status(400).json({
					success: false,
					message: 'Cannot reactivate booking: room has no available slots'
				});
			}
			room.availableRooms -= 1;
			await room.save();
		}

		booking.status = status;
		await booking.save();

		const updatedBooking = await Booking.findById(booking._id).populate('room', 'name price image');

		res.status(200).json({
			success: true,
			data: updatedBooking
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const cancelMyBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id);
		if (!booking) {
			return res.status(404).json({
				success: false,
				message: 'Booking not found'
			});
		}

		if (!booking.user || booking.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to cancel this booking'
			});
		}

		// Users can cancel only selected statuses.
		if (booking.status !== 'cancelled' && !CANCELLABLE_BY_USER.includes(booking.status)) {
			return res.status(400).json({
				success: false,
				message: `Cannot cancel booking in status: ${booking.status}`
			});
		}

		// Only first cancellation changes availability and booking status.
		if (booking.status !== 'cancelled') {
			const room = await Room.findById(booking.room);
			if (room) {
				room.availableRooms += 1;
				await room.save();
			}
			booking.status = 'cancelled';
			await booking.save();
		}

		res.status(200).json({
			success: true,
			message: 'Booking cancelled successfully',
			data: booking
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};

export const deleteBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id);
		if (!booking) {
			return res.status(404).json({
				success: false,
				message: 'Booking not found'
			});
		}

		// If the booking was not already cancelled, return the room to inventory
		if (booking.status !== 'cancelled') {
			const room = await Room.findById(booking.room);
			if (room) {
				room.availableRooms += 1;
				await room.save();
			}
		}

		await Booking.findByIdAndDelete(req.params.id);

		res.status(200).json({
			success: true,
			message: 'Booking deleted successfully'
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};
