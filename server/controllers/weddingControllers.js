import WeddingHall from '../models/weddingHall.js';
import WeddingBooking from '../models/weddingBooking.js';

// STEP 2 API: Create booking request.
// Route: POST /api/wedding/bookings
export const createBooking = async (req, res) => {
    try {
        // Read required fields from request body.
        const { 
            eventDate, hallId, guestCount,
            eventType, startTime, endTime, 
            cateringPackage, selectedMeals = [], optionalServices = [], specialRequests,
            customerName, customerPhone, customerEmail,
            advancePaid = 0,
            bookingCategory = 'Wedding',
            venuePreference = 'Indoor',
            timeSlot = 'Day'
        } = req.body;

        // Basic required-field validation.
        if (!eventDate || !hallId || !guestCount || !eventType || !startTime || !endTime || !customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (eventDate, hallId, guestCount, eventType, startTime, endTime, customerName, customerPhone)'
            });
        }

        if (bookingCategory === 'Wedding' && !cateringPackage) {
            return res.status(400).json({ success: false, message: 'Catering package is required for Weddings' });
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

        // Check for time slot overlap in the same hall on the same day.
        const overlappingBooking = await WeddingBooking.findOne({
            hallId,
            eventDate: { $gte: startOfDay, $lte: endOfDay },
            bookingStatus: { $in: ['pending', 'confirmed'] },
            $or: [
                { startTime: { $lte: startTime }, endTime: { $gte: startTime } },
                { startTime: { $lte: endTime }, endTime: { $gte: endTime } },
                { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
            ]
        });

        if (overlappingBooking) {
            return res.status(409).json({
                success: false,
                message: `This hall is already booked from ${overlappingBooking.startTime} to ${overlappingBooking.endTime} on this day.`
            });
        }

        // Calculate Total Amount
        let totalAmount = hall.price;

        if (bookingCategory === 'Wedding') {
            const packagePrices = {
                'Silver': 2500,
                'Gold': 4000,
                'Platinum': 6500
            };
            if (packagePrices[cateringPackage]) {
                totalAmount += packagePrices[cateringPackage] * Number(guestCount);
            }
        } else {
            // General Event: Use individual meal prices
            const mealPrices = {
                'Breakfast': 800,
                'Lunch': 1500,
                'Tea Time': 600,
                'Dinner': 1800
            };
            selectedMeals.forEach(meal => {
                if (mealPrices[meal]) {
                    totalAmount += mealPrices[meal] * Number(guestCount);
                }
            });
        }

        const weddingServicePrices = {
            'Decorations': 45000, 'DJ/Music': 35000, 'Photography': 55000,
            'Videography': 40000, 'Wedding Cake': 25000, 'Lighting System': 30000,
            'Flower Arrangements': 20000
        };

        const eventServicePrices = {
            'Decorations': 15000, 'DJ/Music': 10000, 'Photography': 15000,
            'Videography': 12000, 'Wedding Cake': 8000, 'Lighting System': 8000,
            'Flower Arrangements': 5000
        };

        const servicePrices = bookingCategory === 'Wedding' ? weddingServicePrices : eventServicePrices;

        if (Array.isArray(optionalServices)) {
            optionalServices.forEach(service => {
                if (servicePrices[service]) {
                    totalAmount += servicePrices[service];
                }
            });
        }

        // --- Extra Hour Logic ---
        const calculateDuration = (start, end) => {
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            let diff = (eH + eM/60) - (sH + sM/60);
            if (diff < 0) diff += 24; 
            return diff;
        };

        const duration = calculateDuration(startTime, endTime);
        const standardHours = bookingCategory === 'Wedding' ? (timeSlot === 'Day' ? 7 : 6) : 6;
        const extraHourPrice = bookingCategory === 'Wedding' ? 10000 : 5000;

        if (duration > standardHours) {
            const extraHours = Math.ceil(duration - standardHours);
            totalAmount += extraHours * extraHourPrice;
        }
        // -------------------------

        // Enforce 20% minimum advance payment
        const minAdvance = totalAmount * 0.20;
        const paidAmount = Number(advancePaid);
        if (paidAmount < minAdvance) {
            return res.status(400).json({
                success: false,
                message: `Minimum 20% advance payment is required. Please pay at least Rs. ${minAdvance.toLocaleString()}`
            });
        }

        // Determine Payment Status
        let paymentStatus = 'Pending';
        if (paidAmount >= totalAmount) {
            paymentStatus = 'Fully Paid';
        } else if (paidAmount > 0) {
            paymentStatus = 'Partially Paid';
        }
        // Initialize and save booking document.
        const booking = new WeddingBooking({
            eventDate: requestedDate,
            hallId,
            guestCount,
            eventType,
            startTime,
            endTime,
            cateringPackage: bookingCategory === 'Wedding' ? cateringPackage : 'Custom',
            selectedMeals,
            optionalServices,
            specialRequests,
            totalAmount,
            advancePaid: Number(advancePaid),
            customerName,
            customerPhone,
            customerEmail,
            bookingCategory,
            timeSlot,
            venuePreference: bookingCategory === 'Wedding' ? 'Indoor' : venuePreference,
            paymentStatus: Number(advancePaid) >= totalAmount ? 'Fully Paid' : (Number(advancePaid) > 0 ? 'Partially Paid' : 'Pending'),
            // Real-life Logic: Minimum 25% required for automatic confirmation.
            bookingStatus: Number(advancePaid) >= (totalAmount * 0.25) ? 'confirmed' : 'pending'
        });

        await booking.save();

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

// API: Add/Update payment for a booking.
// Route: PUT /api/wedding/bookings/:id/payment
export const addPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount } = req.body;

        if (!paymentAmount || Number(paymentAmount) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
        }

        const booking = await WeddingBooking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        booking.advancePaid += Number(paymentAmount);

        // Update payment status
        if (booking.advancePaid >= booking.totalAmount) {
            booking.paymentStatus = 'Fully Paid';
        } else if (booking.advancePaid > 0) {
            booking.paymentStatus = 'Partially Paid';
        }

        // Real-life Logic: Auto-confirm if 25% threshold reached
        if (booking.bookingStatus === 'pending' && booking.advancePaid >= (booking.totalAmount * 0.25)) {
            booking.bookingStatus = 'confirmed';
        }

        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Payment added successfully',
            data: booking
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// API: Update guest count for a booking.
// Route: PUT /api/wedding/bookings/:id/guest-count
export const updateGuestCount = async (req, res) => {
    try {
        const { id } = req.params;
        const { guestCount } = req.body;

        if (!guestCount || Number(guestCount) < 1) {
            return res.status(400).json({ success: false, message: 'Valid guest count is required' });
        }

        const booking = await WeddingBooking.findById(id).populate('hallId');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Recalculate total amount based on new guest count
        let totalAmount = booking.hallId.price;
        const packagePrices = { 'Silver': 2500, 'Gold': 4000, 'Platinum': 6500 };
        const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
        
        const weddingServicePrices = {
            'Decorations': 45000, 'DJ/Music': 35000, 'Photography': 55000,
            'Videography': 40000, 'Wedding Cake': 25000, 'Lighting System': 30000,
            'Flower Arrangements': 20000
        };

        const eventServicePrices = {
            'Decorations': 15000, 'DJ/Music': 10000, 'Photography': 15000,
            'Videography': 12000, 'Wedding Cake': 8000, 'Lighting System': 8000,
            'Flower Arrangements': 5000
        };

        if (booking.bookingCategory === 'Wedding') {
            if (booking.cateringPackage && packagePrices[booking.cateringPackage]) {
                totalAmount += packagePrices[booking.cateringPackage] * Number(guestCount);
            }
        } else {
            booking.selectedMeals.forEach(meal => {
                totalAmount += (mealPrices[meal] || 0) * Number(guestCount);
            });
        }

        const servicePrices = booking.bookingCategory === 'Wedding' ? weddingServicePrices : eventServicePrices;

        booking.optionalServices.forEach(s => {
            totalAmount += servicePrices[s] || 0;
        });

        // --- Extra Hour Logic ---
        const calculateDuration = (start, end) => {
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            let diff = (eH + eM/60) - (sH + sM/60);
            if (diff < 0) diff += 24; 
            return diff;
        };

        const duration = calculateDuration(booking.startTime, booking.endTime);
        const standardHours = booking.bookingCategory === 'Wedding' ? (booking.timeSlot === 'Day' ? 7 : 6) : 6;
        const extraHourPrice = booking.bookingCategory === 'Wedding' ? 10000 : 5000;

        if (duration > standardHours) {
            const extraHours = Math.ceil(duration - standardHours);
            totalAmount += extraHours * extraHourPrice;
        }
        // -------------------------

        booking.guestCount = Number(guestCount);
        booking.totalAmount = totalAmount;

        // Re-check payment status
        if (booking.advancePaid >= booking.totalAmount) {
            booking.paymentStatus = 'Fully Paid';
        } else if (booking.advancePaid > 0) {
            booking.paymentStatus = 'Partially Paid';
        } else {
            booking.paymentStatus = 'Pending';
        }

        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Guest count and total amount updated successfully',
            data: booking
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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

// STEP 5 API: Get all wedding bookings.
// Route: GET /api/wedding/bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await WeddingBooking.find()
            .populate('hallId', 'hallName capacity price status')
            .sort({ eventDate: 1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
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
        const normalizedEmail = String(req.user.email).trim().toLowerCase();
        const bookings = await WeddingBooking.find({
            $or: [
                { customerId: req.user._id },
                { customerEmail: normalizedEmail }
            ]
        })
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

// Admin: Create a new hall/venue
export const createHall = async (req, res) => {
    try {
        const { hallName, capacity, price, type, status } = req.body;
        
        if (!hallName || !capacity || !price) {
            return res.status(400).json({ success: false, message: 'Please provide hallName, capacity, and price' });
        }

        const hall = await WeddingHall.create({
            hallName,
            capacity,
            price,
            type: type || 'Hall',
            status: status || 'available'
        });

        res.status(201).json({
            success: true,
            message: 'Venue created successfully',
            data: hall
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update hall/venue details
export const updateHall = async (req, res) => {
    try {
        const { hallName, capacity, price, type, status } = req.body;
        
        const hall = await WeddingHall.findByIdAndUpdate(
            req.params.id,
            { hallName, capacity, price, type, status },
            { new: true, runValidators: true }
        );

        if (!hall) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Venue updated successfully',
            data: hall
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Delete hall/venue
export const deleteHall = async (req, res) => {
    try {
        const hall = await WeddingHall.findById(req.params.id);
        
        if (!hall) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }

        // Check if there are any bookings for this hall (optional safety check)
        const bookingsCount = await WeddingBooking.countDocuments({ hallId: req.params.id });
        if (bookingsCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete venue that has existing bookings. Please cancel or delete the bookings first.' 
            });
        }

        await hall.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Venue deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Toggle hall status
export const toggleHallStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['available', 'maintenance', 'occupied', 'unavailable'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const hall = await WeddingHall.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!hall) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }

        res.status(200).json({
            success: true,
            message: `Venue status updated to ${status}`,
            data: hall
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Public: Get monthly booked dates for the calendar
export const getMonthlyBookedDates = async (req, res) => {
    try {
        const { year, month } = req.query; // format: 2026, 5
        
        if (!year || !month) {
             return res.status(400).json({ success: false, message: 'Please provide year and month query parameters' });
        }

        // JS Date month is 0-indexed
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day of the month

        // Find all bookings in this month that are pending or confirmed
        const bookings = await WeddingBooking.find({
            eventDate: { $gte: startDate, $lte: endDate },
            bookingStatus: { $in: ['pending', 'confirmed'] }
        }).select('eventDate hallId');

        // Group by date
        const dateMap = {};
        bookings.forEach(booking => {
            const dateStr = booking.eventDate.toISOString().split('T')[0];
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = new Set();
            }
            dateMap[dateStr].add(booking.hallId.toString());
        });

        const bookedDates = Object.keys(dateMap).map(date => ({
            date,
            bookedVenuesCount: dateMap[date].size
        }));

        res.status(200).json({
            success: true,
            data: bookedDates
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

