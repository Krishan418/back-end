import PoolBooking from '../models/poolBooking.js';

const allowedStatuses = new Set(['Confirmed', 'Checked-In', 'Completed', 'Cancelled']);

const parseGuestCount = (value) => {
    const guests = Number.parseInt(value, 10);
    return Number.isFinite(guests) && guests > 0 ? guests : null;
};

const parsePrice = (value) => {
    const price = Number.parseFloat(value);
    return Number.isFinite(price) && price >= 0 ? price : null;
};

export const createPoolBooking = async (req, res) => {
    try {
        const {
            guestName,
            guestEmail,
            roomNumber = '',
            date,
            timeSlot,
            numberOfGuests,
            status = 'Confirmed',
            pricePerPerson
        } = req.body || {};

        if (!guestName || !guestEmail || !date || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: 'guestName, guestEmail, date, and timeSlot are required.'
            });
        }

        const guests = parseGuestCount(numberOfGuests);
        if (!guests) {
            return res.status(400).json({
                success: false,
                message: 'numberOfGuests must be a positive number.'
            });
        }

        const perPersonPrice = parsePrice(pricePerPerson);
        if (perPersonPrice === null) {
            return res.status(400).json({
                success: false,
                message: 'pricePerPerson must be a valid number.'
            });
        }

        const normalizedStatus = allowedStatuses.has(status) ? status : 'Confirmed';
        const totalAmount = Number((perPersonPrice * guests).toFixed(2));

        const booking = await PoolBooking.create({
            guestName,
            guestEmail,
            roomNumber,
            date,
            timeSlot,
            numberOfGuests: guests,
            status: normalizedStatus,
            pricePerPerson: perPersonPrice,
            totalAmount
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
            roomNumber = '',
            date,
            timeSlot,
            numberOfGuests,
            status,
            pricePerPerson
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        const updateData = { guestName, guestEmail, roomNumber, date, timeSlot };
        
        if (numberOfGuests !== undefined) {
            const guests = parseGuestCount(numberOfGuests);
            if (!guests) return res.status(400).json({ success: false, message: 'numberOfGuests must be a positive number.' });
            updateData.numberOfGuests = guests;
        }

        if (pricePerPerson !== undefined) {
            const perPersonPrice = parsePrice(pricePerPerson);
            if (perPersonPrice === null) return res.status(400).json({ success: false, message: 'pricePerPerson must be a valid number.' });
            updateData.pricePerPerson = perPersonPrice;
        }

        if (status !== undefined) {
            updateData.status = allowedStatuses.has(status) ? status : 'Confirmed';
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