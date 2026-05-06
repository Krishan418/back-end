import WeddingHall from '../models/weddingHall.js';
import WeddingBooking from '../models/weddingBooking.js';

// STEP 2 API: Create booking request.
// Route: POST /api/wedding/bookings
export const createBooking = async (req, res) => {
    try {
        // Read required fields from request body.
        const { eventDate, hallId, packageType, guestCount } = req.body;

        // Basic required-field validation.
        if (!eventDate || !hallId || !packageType || !guestCount) {
            return res.status(400).json({
                success: false,
                message: 'Please provide eventDate, hallId, packageType and guestCount'
            });
        }

        // Parse and validate date.
        const requestedDate = new Date(eventDate);
        if (Number.isNaN(requestedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid eventDate format. Use YYYY-MM-DD'
            });
        }

        // Guest count should be a positive number.
        if (Number(guestCount) < 1) {
            return res.status(400).json({
                success: false,
                message: 'guestCount must be at least 1'
            });
        }

        // Check whether hall exists.
        const hall = await WeddingHall.findById(hallId);
        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Wedding hall not found'
            });
        }

        // Hall must be operational for booking.
        if (hall.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: `Hall is currently ${hall.status} and cannot be booked`
            });
        }

        // Booking cannot exceed hall capacity.
        if (Number(guestCount) > hall.capacity) {
            return res.status(400).json({
                success: false,
                message: `Guest count exceeds hall capacity (${hall.capacity})`
            });
        }

        // Build date boundaries for same-day conflict check.
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Check if this hall already has a blocking booking on that day.
        const existingBooking = await WeddingBooking.findOne({
            hallId,
            eventDate: { $gte: startOfDay, $lte: endOfDay },
            bookingStatus: { $in: ['pending', 'confirmed'] }
        });

        if (existingBooking) {
            return res.status(409).json({
                success: false,
                message: 'This hall is already booked for the selected date'
            });
        }

        // Create booking with default status = pending.
        const booking = await WeddingBooking.create({
            eventDate: requestedDate,
            hallId,
            customerId: req.user.id,
            packageType,
            guestCount,
            bookingStatus: 'pending'
        });

        return res.status(201).json({
            success: true,
            message: 'Booking request created successfully',
            data: booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// STEP 3 API: Update booking status.
// Route: PUT /api/wedding/bookings/:id/status
export const updateBookingStatus = async (req, res) => {
    try {
        // Get booking id from URL path.
        const { id } = req.params;

        // Get target status from request body.
        const { bookingStatus } = req.body;

        // Validate that a new status was provided.
        if (!bookingStatus) {
            return res.status(400).json({
                success: false,
                message: 'Please provide bookingStatus in request body'
            });
        }

        // Allowed workflow statuses for bookings.
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected'];

        // Reject unsupported status values.
        if (!validStatuses.includes(bookingStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid bookingStatus. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Find booking by id.
        const booking = await WeddingBooking.findById(id);

        // Return 404 if booking does not exist.
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Update status and save.
        booking.bookingStatus = bookingStatus;
        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: booking
        });
    } catch (error) {
        // CastError (bad ObjectId) will also be handled here.
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// STEP 4 API: Delete booking request.
// Route: DELETE /api/wedding/bookings/:id
export const deleteBookingRequest = async (req, res) => {
    try {
        // Read booking id from URL params.
        const { id } = req.params;

        // Find booking first to return a clear 404 if it does not exist.
        const booking = await WeddingBooking.findById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Permanently remove the booking document.
        await booking.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Booking request deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// STEP 1 API: Read hall availability by event date.
// Route: GET /api/wedding/halls/availability?date=YYYY-MM-DD
export const getHallAvailability = async (req, res) => {
    try {
        // Read the date from query string.
        // Example: /availability?date=2026-12-10
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Please provide date query parameter in format YYYY-MM-DD'
            });
        }

        const requestedDate = new Date(date);

        // Validate invalid date values (e.g., 2026-99-99).
        if (Number.isNaN(requestedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Build start/end boundaries for that calendar day.
        // This helps us match all bookings on the same day.
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Only bookings that are not cancelled/rejected should block availability.
        const blockingBookings = await WeddingBooking.find({
            eventDate: { $gte: startOfDay, $lte: endOfDay },
            bookingStatus: { $in: ['pending', 'confirmed'] }
        }).select('hallId');

        // Convert booked hall IDs into a Set for quick lookup.
        const bookedHallIdSet = new Set(
            blockingBookings.map((booking) => booking.hallId.toString())
        );

        // Fetch all halls to produce a full availability list.
        const halls = await WeddingHall.find();

        // Compute availability hall-by-hall.
        const availability = halls.map((hall) => {
            const hallId = hall._id.toString();
            const alreadyBooked = bookedHallIdSet.has(hallId);
            const hallIsOperational = hall.status === 'available';
            const isAvailable = hallIsOperational && !alreadyBooked;

            return {
                _id: hall._id,
                hallName: hall.hallName,
                capacity: hall.capacity,
                price: hall.price,
                status: hall.status,
                isAvailable,
                reason: isAvailable
                    ? 'Hall is free for this date'
                    : alreadyBooked
                        ? 'Hall already has a booking on this date'
                        : `Hall is currently ${hall.status}`
            };
        });

        return res.status(200).json({
            success: true,
            date,
            count: availability.length,
            data: availability
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get current user's wedding bookings
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await WeddingBooking.find({ customerId: req.user.id })
            .populate('hallId', 'hallName capacity');

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all halls
export const getHalls = async (req, res) => {
    try {
        const halls = await WeddingHall.find();
        res.status(200).json({
            success: true,
            data: halls
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Toggle hall status
export const toggleHallStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['available', 'maintenance', 'occupied'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const hall = await WeddingHall.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!hall) {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }

        res.status(200).json({
            success: true,
            message: `Hall status updated to ${status}`,
            data: hall
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
