
import PoolBooking from '../models/poolBooking.js';
import { sendPoolBookingSMS } from '../utils/sms.js';

const allowedStatuses = new Set(['Confirmed', 'Checked-In', 'Completed', 'Cancelled']);

const parseGuestCount = (value) => {
    const guests = Number.parseInt(value, 10);
    return Number.isFinite(guests) && guests > 0 ? guests : null;
};

const parsePrice = (value) => {
    const price = Number.parseFloat(value);
    return Number.isFinite(price) && price >= 0 ? price : null;
};

const calculatePricePerPerson = (checkInTime, checkOutTime) => {
    try {
        const [inHour, inMin] = checkInTime.split(':').map(Number);
        const [outHour, outMin] = checkOutTime.split(':').map(Number);
        
        const inTotalMinutes = inHour * 60 + inMin;
        const outTotalMinutes = outHour * 60 + outMin;
        
        let durationMinutes = outTotalMinutes - inTotalMinutes;
        if (durationMinutes <= 0) durationMinutes += 24 * 60; // Next day
        
        const durationHours = durationMinutes / 60;
        
        // Rs. 500 for first 2 hours, Rs. 200 for each additional hour
        if (durationHours <= 2) {
            return 500;
        }
        const additionalHours = Math.ceil(durationHours - 2);
        return 500 + (additionalHours * 200);
    } catch (e) {
        return null;
    }
};

export const createPoolBooking = async (req, res) => {
    try {
        const {
            guestName,
            guestEmail,
            guestPhone,
            roomNumber = '',
            date,
            timeSlot,
            checkInTime,
            checkOutTime,
            numberOfGuests,
            status = 'Confirmed'
        } = req.body || {};

        if (!guestName || !guestPhone || !date || !timeSlot || !checkInTime || !checkOutTime) {
            return res.status(400).json({
                success: false,
                message: 'guestName, guestPhone, date, timeSlot, checkInTime, and checkOutTime are required.'
            });
        }

        // Validate email format if provided
        if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email format.'
            });
        }

        // Validate phone format
        if (guestPhone && !/^(?:\+94|0)?7[0-9]{8}$/.test(guestPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid Sri Lankan phone number (e.g., 0771234567 or +94771234567).'
            });
        }

        // Disallow booking dates in the past (compare dates at midnight)
        const bookingDate = new Date(date);
        bookingDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(bookingDate.getTime()) || bookingDate < today) {
            return res.status(400).json({ success: false, message: 'Booking date cannot be in the past.' });
        }

        const guests = parseGuestCount(numberOfGuests);
        if (!guests) {
            return res.status(400).json({
                success: false,
                message: 'numberOfGuests must be a positive number.'
            });
        }

        // Calculate price per person based on duration
        // Validate times are in allowed window
        if (!isTimeInAllowedWindow(checkInTime) || !isTimeInAllowedWindow(checkOutTime)) {
            return res.status(400).json({ success: false, message: 'Times must be between 08:00 and 19:00' });
        }

        const startMin = timeToMinutes(checkInTime);
        const endMin = timeToMinutes(checkOutTime);
        if (endMin <= startMin) {
            return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
        }

        const pricePerPerson = calculatePricePerPerson(checkInTime, checkOutTime);
        if (pricePerPerson === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid check-in or check-out time format. Use HH:mm format.'
            });
        }

        const normalizedStatus = allowedStatuses.has(status) ? status : 'Confirmed';
        const totalAmount = Number((pricePerPerson * guests).toFixed(2));

        const booking = await PoolBooking.create({
            guestName,
            guestEmail,
            guestPhone,
            roomNumber,
            date,
            timeSlot,
            checkInTime,
            checkOutTime,
            numberOfGuests: guests,
            status: normalizedStatus,
            pricePerPerson: pricePerPerson,
            totalAmount
        });

        // Trigger SMS confirmation
        await sendPoolBookingSMS({
            guestName: booking.guestName,
            guestPhone: booking.guestPhone,
            checkInTime: booking.checkInTime,
            checkOutTime: booking.checkOutTime,
            numberOfGuests: booking.numberOfGuests,
            totalAmount: booking.totalAmount
        });

        return res.status(201).json({
            success: true,
            message: 'Pool booking created successfully.',
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const listPoolBookings = async (req, res) => {
    try {
        const bookings = await PoolBooking.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            bookings
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updatePoolBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            guestName,
            guestEmail,
            guestPhone,
            roomNumber = '',
            date,
            timeSlot,
            checkInTime,
            checkOutTime,
            numberOfGuests,
            status
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        if (guestPhone !== undefined) {
            if (!/^(?:\+94|0)?7[0-9]{8}$/.test(guestPhone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid Sri Lankan phone number (e.g., 0771234567 or +94771234567).'
                });
            }
        }

        const updateData = { guestName, guestEmail, guestPhone, roomNumber, timeSlot };
        
        if (numberOfGuests !== undefined) {
            const guests = parseGuestCount(numberOfGuests);
            if (!guests) return res.status(400).json({ success: false, message: 'numberOfGuests must be a positive number.' });
            updateData.numberOfGuests = guests;
        }

        if (status !== undefined) {
            updateData.status = allowedStatuses.has(status) ? status : 'Confirmed';
        }

        if (date !== undefined) {
            // Validate date is not in the past
            const bookingDate = new Date(date);
            bookingDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(bookingDate.getTime()) || bookingDate < today) {
                return res.status(400).json({ success: false, message: 'Booking date cannot be in the past.' });
            }
            updateData.date = date;
        }

        if (checkInTime !== undefined || checkOutTime !== undefined) {
            const bookingToCheck = await PoolBooking.findById(id);
            if (!bookingToCheck) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }

            const finalCheckIn = checkInTime ?? bookingToCheck.checkInTime;
            const finalCheckOut = checkOutTime ?? bookingToCheck.checkOutTime;

            // Validate allowed window
            if (!isTimeInAllowedWindow(finalCheckIn) || !isTimeInAllowedWindow(finalCheckOut)) {
                return res.status(400).json({ success: false, message: 'Times must be between 08:00 and 19:00' });
            }

            const startMin = timeToMinutes(finalCheckIn);
            const endMin = timeToMinutes(finalCheckOut);
            if (endMin <= startMin) {
                return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
            }

            const pricePerPerson = calculatePricePerPerson(finalCheckIn, finalCheckOut);
            if (pricePerPerson === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid check-in or check-out time format. Use HH:mm format.'
                });
            }

            updateData.checkInTime = finalCheckIn;
            updateData.checkOutTime = finalCheckOut;
            updateData.pricePerPerson = pricePerPerson;
        }

        // Calculate totalAmount if guests or pricePerPerson are updated
        const bookingToUpdate = await PoolBooking.findById(id);
        if (!bookingToUpdate) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const finalGuests = updateData.numberOfGuests ?? bookingToUpdate.numberOfGuests;
        const finalPrice = updateData.pricePerPerson ?? bookingToUpdate.pricePerPerson;
        updateData.totalAmount = Number((finalPrice * finalGuests).toFixed(2));

        const updatedBooking = await PoolBooking.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        
        return res.status(200).json({
            success: true,
            message: 'Pool booking updated successfully.',
            booking: updatedBooking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deletePoolBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        const deletedBooking = await PoolBooking.findByIdAndDelete(id);
        if (!deletedBooking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Pool booking deleted successfully.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const timeToMinutes = (t) => {
    const [h, m] = (t || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};

const isTimeInAllowedWindow = (time) => {
    const minutes = timeToMinutes(time);
    if (minutes === null) return false;
    return minutes >= 8 * 60 && minutes <= 19 * 60; // 08:00 - 19:00
};