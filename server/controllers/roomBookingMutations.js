import Booking from '../models/booking.js';
import Room from '../models/room.js';
import sendEmail from '../utils/email.js';
import Settings from '../models/Settings.js';
import Payment from '../models/payment.js';
import {
	CANCELLABLE_BY_USER,
	isValidStatusTransition,
	sanitizeDecorationItems,
	calculateDecorationTotal
} from './roombookinghekpers.js';

const isAcRoom = (roomName, specialRequests) => {
  const norm = (roomName || '').toLowerCase().replace(/[^a-z]/g, '');
  if (norm.includes('family')) {
    if (specialRequests && String(specialRequests).toLowerCase().includes('non-ac')) {
      return false;
    }
    return true;
  }
  return !norm.includes('nonac');
};

const getRoomOptionPrice = (roomName, isAc, stayMode) => {
  const norm = (roomName || '').toLowerCase().replace(/[^a-z]/g, '');
  const isFamily = norm.includes('family');
  const isHoneymoon = norm.includes('honeymoon') || norm.includes('wedding');

  if (isFamily) {
    if (isAc) {
      return stayMode === 'onlyNight' ? 6750 : 8750;
    } else {
      return stayMode === 'onlyNight' ? 5500 : 6750;
    }
  } else if (isHoneymoon) {
    return 9500;
  } else {
    // Standard Room
    if (isAc) {
      if (stayMode === 'onlyDay') return 6000;
      if (stayMode === 'onlyNight') return 5500;
      return 8500; // 24 hours
    } else {
      if (stayMode === 'onlyDay') return 4000;
      if (stayMode === 'onlyNight') return 4500;
      return 7500; // 24 hours
    }
  }
};

const getCalculatedStayMode = (stayMode, slots, checkInType, checkOutType) => {
	if (stayMode === 'custom' && slots === 1) {
		if (checkInType === 'Night' && checkOutType === 'Night') {
			return 'onlyNight';
		} else {
			return 'onlyDay';
		}
	}
	return stayMode;
};

const sendBookingCancellationEmail = async (booking, actionLabel = 'cancelled') => {
	if (!booking?.email) return;

	// Load settings to check notification preferences
	const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
	if (settings.notifications?.newBookings === false) {
		console.log('Skipping booking cancellation email due to settings.');
		return;
	}

	const roomRecord = booking.room?.name ? booking.room : await Room.findById(booking.room).select('name');
	const roomName = roomRecord?.name || 'your room booking';
	const bookingRef = booking._id ? String(booking._id).slice(-8).toUpperCase() : 'N/A';
	const subject = `Booking ${actionLabel === 'deleted' ? 'Removed' : 'Cancelled'} - Hotel Janro`;
	const message = `Dear ${booking.fullName || 'Guest'},\n\nYour booking for ${roomName} has been ${actionLabel === 'deleted' ? 'removed by reception' : 'cancelled'}.\n\nBooking Ref: ${bookingRef}\nIf you have any questions, please contact us.\n\nThank you, Hotel Janro`;
	const html = `
		<h2>Booking ${actionLabel === 'deleted' ? 'Removed' : 'Cancelled'}</h2>
		<p>Dear ${booking.fullName || 'Guest'},</p>
		<p>Your booking for <strong>${roomName}</strong> has been <strong>${actionLabel === 'deleted' ? 'removed by reception' : 'cancelled'}</strong>.</p>
		<p><strong>Booking Ref:</strong> ${bookingRef}</p>
		<p>If you have any questions, please contact us.</p>
		<p>Thank you,<br/>Hotel Janro</p>
	`;

	await sendEmail({
		email: booking.email,
		subject,
		message,
		html
	});
};

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
			stayMode,
			roomNumber,
			paymentMethod
		} = req.body;

		//Required Fields Validation
		if (!roomId || !checkInDate || !checkOutDate || !guests || !fullName || !email || !roomNumber) {
			return res.status(400).json({
				success: false,
				message: 'Missing required booking fields (including roomNumber)'
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
			if (endIndex < startIndex) {
				return res.status(400).json({
					success: false,
					message: 'Check-out date/time cannot be before check-in date/time'
				});
			}
			slots = endIndex - startIndex + 1;
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
		const isAc = isAcRoom(room.name, specialRequests);
		const calculatedStayMode = getCalculatedStayMode(stayMode, slots, checkInType, checkOutType);
		const basePrice = getRoomOptionPrice(room.name, isAc, calculatedStayMode);
		const totalPrice = (basePrice * slots) + decorationTotal;

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
			endIndex,
			roomNumber,
			paymentMethod: paymentMethod || 'Cash'
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

		// Optionally send an email notifying user of status change
		try {
			let subject, message, htmlContent;
			if (status === 'confirmed') {
				const bookingIdStr = updatedBooking._id ? String(updatedBooking._id).slice(-8).toUpperCase() : 'N/A';
				const checkInStr = new Date(updatedBooking.checkInDate).toLocaleDateString();
				const checkOutStr = new Date(updatedBooking.checkOutDate).toLocaleDateString();
				
				subject = 'Booking Confirmed - Hotel Janro';
				message = `Booking Confirmed!\n\nDear ${updatedBooking.fullName},\n\nYour booking has been successfully confirmed.\n\nBooking ID: BK${bookingIdStr}\nRoom: ${updatedBooking.room?.name}\nCheck-in: ${checkInStr}\nCheck-out: ${checkOutStr}\nGuests: ${updatedBooking.guests}\nTotal Price: Rs. ${updatedBooking.totalPrice.toLocaleString()}\nPayment Status: Pending (Pay at Reception)\n\nWe look forward to hosting you.\n\nThank you,\nHotel Janro`;
				
				htmlContent = `
					<h2>Booking Confirmed!</h2>
					<p>Dear ${updatedBooking.fullName},</p>
					<p>Your booking has been successfully confirmed.</p>
					<p>
						<strong>Booking ID:</strong> BK${bookingIdStr}<br/>
						<strong>Room:</strong> ${updatedBooking.room?.name}<br/>
						<strong>Check-in:</strong> ${checkInStr}<br/>
						<strong>Check-out:</strong> ${checkOutStr}<br/>
						<strong>Guests:</strong> ${updatedBooking.guests}<br/>
						<strong>Total Price:</strong> Rs. ${updatedBooking.totalPrice.toLocaleString()}<br/>
						<strong>Payment Status:</strong> Pending (Pay at Reception)
					</p>
					<p>We look forward to hosting you.</p>
					<p>Thank you,<br/>Hotel Janro</p>
				`;
			} else if (status === 'cancelled') {
				subject = 'Booking Cancelled/Rejected - Hotel Janro';
				message = `Dear ${updatedBooking.fullName},\n\nYour booking for ${updatedBooking.room?.name} has been cancelled or rejected.\nIf you have any questions, please contact us.\n\nThank you, Hotel Janro`;
				htmlContent = `
					<h2>Booking Status Update</h2>
					<p>Dear ${updatedBooking.fullName},</p>
					<p>Your booking for <strong>${updatedBooking.room?.name}</strong> has been cancelled or rejected.</p>
					<p>If you have any questions, please contact us.</p>
					<p>Thank you,<br/>Hotel Janro</p>
				`;
			}

			if (subject && message && htmlContent) {
				const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
				if (settings.notifications?.newBookings !== false) {
					await sendEmail({
						email: updatedBooking.email,
						subject,
						message,
						html: htmlContent
					});
				} else {
					console.log('Skipping booking status update email due to settings.');
				}
			}
		} catch (error) {
			console.error('Failed to send status update email', error);
		}

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

		try {
			await sendBookingCancellationEmail(booking, 'cancelled');
		} catch (error) {
			console.error('Failed to send booking cancellation email', error);
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

		try {
			await sendBookingCancellationEmail(booking, 'deleted');
		} catch (error) {
			console.error('Failed to send booking deletion email', error);
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

export const updateBookingDetails = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id);
		if (!booking) {
			return res.status(404).json({
				success: false,
				message: 'Booking not found'
			});
		}

		// Authorization: Admin/Staff can always edit. Owner can edit ONLY if check-in is >= 3 days away.
		const isStaff = ['admin', 'manager', 'receptionist', 'reception'].includes(req.user.role);
		const isOwner = booking.user && booking.user.toString() === req.user._id.toString();

		if (!isStaff && !isOwner) {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to edit this booking'
			});
		}

		if (!isStaff) {
			// Enforce 3 days policy for customer
			const checkInDate = new Date(booking.checkInDate);
			const diffTime = checkInDate.getTime() - Date.now();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			if (diffDays < 3) {
				return res.status(400).json({
					success: false,
					message: 'Bookings can only be edited at least 3 days prior to check-in.'
				});
			}
		}

		// Fields we can update
		const {
			fullName,
			phone,
			guests,
			specialRequests,
			decorationItems,
			paymentStatus,
			paymentMethod,
			status
		} = req.body;

		const wasPaid = booking.paymentStatus === 'Paid';

		if (fullName) booking.fullName = fullName;
		if (phone) booking.phone = phone;
		if (specialRequests !== undefined) booking.specialRequests = specialRequests;
		if (paymentStatus) booking.paymentStatus = paymentStatus;
		if (paymentMethod) booking.paymentMethod = paymentMethod;
		if (status) booking.status = status;

		// Handle guests change
		if (guests) {
			booking.guests = guests;
		}

		// Handle decorations update (only for honeymoon suite)
		const room = await Room.findById(booking.room);
		if (room && decorationItems) {
			const supportsDecorations = String(room.name || '').toLowerCase().includes('honeymoon');
			const sanitizedDecorationItems = supportsDecorations ? sanitizeDecorationItems(decorationItems) : [];
			const decorationTotal = calculateDecorationTotal(sanitizedDecorationItems);
			
			// Recalculate price: (Base Price * Slots) + Decoration Total
			const isAc = isAcRoom(room.name, booking.specialRequests);
			const slots = booking.nights || 1;
			const calculatedStayMode = getCalculatedStayMode(booking.stayMode, slots, booking.checkInType, booking.checkOutType);
			const basePrice = getRoomOptionPrice(room.name, isAc, calculatedStayMode);
			booking.totalPrice = (basePrice * slots) + decorationTotal;
			booking.decorationItems = sanitizedDecorationItems;
		}

		// Create Payment record if newly paid
		if (paymentStatus === 'Paid' && !wasPaid) {
			try {
				await Payment.create({
					amount: booking.totalPrice || 0,
					method: paymentMethod || 'Online',
					status: 'Completed',
					user: booking.user || "000000000000000000000000",
					referenceId: booking._id,
					onModel: 'Booking'
				});
			} catch (err) {
				console.error("Failed to create Payment log during local update:", err);
			}
		}

		await booking.save();

		const updatedBooking = await Booking.findById(booking._id).populate('room', 'name price image');
		res.status(200).json({
			success: true,
			message: 'Booking updated successfully',
			data: updatedBooking
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
};
