import WeddingHall from '../models/weddingHall.js';
import WeddingBooking from '../models/weddingBooking.js';

// Create a new booking 
export const createBooking = async (req, res) => {
    try {
        const { 
            eventDate, hallId, guestCount,
            eventType, startTime, endTime, 
            groomName, brideName, nekathTimes, seatingStyle, dietaryNotes, corkageIncluded,
            cateringPackage, selectedMeals = [], optionalServices = [], specialRequests,
            customerName, customerPhone, customerEmail,
            customerNIC, customerAddress, discountPercentage = 0, complimentaryItems = [],
            advancePaid = 0, customPackagePrice = 0, customPackageNotes = '',
            bookingCategory = 'Wedding',
            venuePreference = 'Indoor',
            timeSlot = 'Day'
        } = req.body;

        // Validate required fields
        if (!eventDate || !hallId || !guestCount || !eventType || !startTime || !endTime || !customerName || !customerPhone) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        if (bookingCategory === 'Wedding' && !cateringPackage) {
            return res.status(400).json({ success: false, message: 'Catering package is required for Weddings' });
        }

        // Validate date format
        const requestedDate = new Date(eventDate);
        if (Number.isNaN(requestedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid eventDate format. Use YYYY-MM-DD' });
        }

        if (Number(guestCount) < 1) {
            return res.status(400).json({ success: false, message: 'guestCount must be at least 1' });
        }

        // Verify hall exists and is available
        const hall = await WeddingHall.findById(hallId);
        if (!hall) return res.status(404).json({ success: false, message: 'Wedding hall not found' });

        if (hall.status !== 'available') {
            return res.status(400).json({ success: false, message: `Hall is currently ${hall.status} and cannot be booked` });
        }

        if (Number(guestCount) > hall.capacity) {
            return res.status(400).json({ success: false, message: `Guest count exceeds hall capacity (${hall.capacity})` });
        }

        // Check for time slot conflicts
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

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
            return res.status(409).json({ success: false, message: `This hall is already booked from ${overlappingBooking.startTime} to ${overlappingBooking.endTime} on this day.` });
        }

        
        let totalAmount = hall.price;

        // Catering cost based on category
        if (bookingCategory === 'Wedding') {
            const packagePrices = { 'Silver': 2500, 'Gold': 4000, 'Platinum': 6500 };
            if (packagePrices[cateringPackage]) {
                totalAmount += packagePrices[cateringPackage] * Number(guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += Number(customPackagePrice) * Number(guestCount);
            }
        } else {
            const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
            selectedMeals.forEach(meal => {
                if (mealPrices[meal]) totalAmount += mealPrices[meal] * Number(guestCount);
            });
        }

        // Optional services
        const weddingServicePrices = { 'Decorations': 35000, 'DJ/Music': 25000, 'Photography': 40000, 'Videography': 30000, 'Wedding Cake': 20000, 'Lighting System': 20000, 'Flower Arrangements': 15000 };
        const eventServicePrices = { 'Decorations': 10000, 'DJ/Music': 7500, 'Photography': 10000, 'Videography': 8000, 'Celebration Cake': 5000, 'Lighting System': 5000, 'Floral Decor': 3500 };
        const servicePrices = bookingCategory === 'Wedding' ? weddingServicePrices : eventServicePrices;

        if (Array.isArray(optionalServices)) {
            optionalServices.forEach(service => {
                if (servicePrices[service]) totalAmount += servicePrices[service];
            });
        }

        // Extra hour charges
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
            totalAmount += Math.ceil(duration - standardHours) * extraHourPrice;
        }

        // Apply discount
        if (discountPercentage && Number(discountPercentage) > 0) {
            totalAmount -= (totalAmount * Number(discountPercentage) / 100);
        }

        // 20%  advance payment
        const minAdvance = totalAmount * 0.20;
        const paidAmount = Number(advancePaid);
        if (paidAmount < minAdvance) {
            return res.status(400).json({ success: false, message: `Minimum 20% advance payment is required. Please pay at least Rs. ${minAdvance.toLocaleString()}` });
        }

        // Determine payment & booking status
        let paymentStatus = paidAmount >= totalAmount ? 'Fully Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Pending');
        let bookingStatus = paidAmount >= (totalAmount * 0.25) ? 'confirmed' : 'pending';

        const booking = new WeddingBooking({
            eventDate: requestedDate, hallId, guestCount, eventType, startTime, endTime,
            groomName, brideName, nekathTimes, seatingStyle, dietaryNotes,
            corkageIncluded: Boolean(corkageIncluded),
            cateringPackage: bookingCategory === 'Wedding' ? cateringPackage : 'Custom',
            customPackagePrice: Number(customPackagePrice), customPackageNotes,
            selectedMeals, optionalServices, specialRequests,
            totalAmount, advancePaid: Number(advancePaid),
            customerName, customerPhone, customerEmail, customerNIC, customerAddress,
            discountPercentage: Number(discountPercentage), complimentaryItems,
            bookingCategory, timeSlot,
            venuePreference: bookingCategory === 'Wedding' ? 'Indoor' : venuePreference,
            paymentStatus, bookingStatus
        });

        await booking.save();

        return res.status(201).json({ success: true, message: 'Booking request created successfully', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update full booking
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            eventDate, hallId, guestCount,
            eventType, startTime, endTime, 
            groomName, brideName, nekathTimes, seatingStyle, dietaryNotes, corkageIncluded,
            cateringPackage, selectedMeals = [], optionalServices = [], specialRequests,
            customerName, customerPhone, customerEmail,
            customerNIC, customerAddress, discountPercentage = 0, complimentaryItems = [],
            advancePaid, customPackagePrice = 0, customPackageNotes = '',
            bookingCategory, venuePreference, timeSlot
        } = req.body;

        const booking = await WeddingBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Recalculate total
        let totalAmount = 0;
        const hall = await WeddingHall.findById(hallId);
        if (hall) totalAmount += hall.price;

        const packagePrices = { Silver: 2500, Gold: 4000, Platinum: 6500 };
        if (bookingCategory === 'Wedding') {
            if (packagePrices[cateringPackage]) {
                totalAmount += (packagePrices[cateringPackage] * guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += (Number(customPackagePrice) * guestCount);
            }
        } else {
            const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
            selectedMeals.forEach(meal => {
                if (mealPrices[meal]) totalAmount += (mealPrices[meal] * guestCount);
            });
        }

        const weddingServicePrices = { 'Decorations': 35000, 'DJ/Music': 25000, 'Photography': 40000, 'Videography': 30000, 'Wedding Cake': 20000, 'Lighting System': 20000, 'Flower Arrangements': 15000 };
        const eventServicePrices = { 'Decorations': 10000, 'DJ/Music': 7500, 'Photography': 10000, 'Videography': 8000, 'Celebration Cake': 5000, 'Lighting System': 5000, 'Floral Decor': 3500 };
        const servicePrices = bookingCategory === 'Wedding' ? weddingServicePrices : eventServicePrices;

        optionalServices.forEach(service => {
            if (servicePrices[service]) totalAmount += servicePrices[service];
        });

        // Extra hour charges
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
            totalAmount += Math.ceil(duration - standardHours) * extraHourPrice;
        }

        if (discountPercentage > 0) totalAmount -= (totalAmount * Number(discountPercentage) / 100);

        // Update all fields
        Object.assign(booking, {
            eventDate, hallId, guestCount, eventType, startTime, endTime,
            groomName, brideName, nekathTimes, seatingStyle, dietaryNotes,
            corkageIncluded: Boolean(corkageIncluded),
            cateringPackage: bookingCategory === 'Wedding' ? cateringPackage : 'Custom',
            customPackagePrice: Number(customPackagePrice), customPackageNotes,
            selectedMeals, optionalServices, specialRequests,
            totalAmount, advancePaid: Number(advancePaid),
            customerName, customerPhone, customerEmail, customerNIC, customerAddress,
            discountPercentage: Number(discountPercentage), complimentaryItems,
            bookingCategory, timeSlot, venuePreference,
            paymentStatus: Number(advancePaid) >= totalAmount ? 'Fully Paid' : (Number(advancePaid) > 0 ? 'Partially Paid' : 'Pending')
        });

        await booking.save();
        return res.status(200).json({ success: true, message: 'Booking updated successfully', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { bookingStatus } = req.body;

        if (!bookingStatus) return res.status(400).json({ success: false, message: 'Please provide bookingStatus' });

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected'];
        if (!validStatuses.includes(bookingStatus)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const booking = await WeddingBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.bookingStatus = bookingStatus;
        await booking.save();

        return res.status(200).json({ success: true, message: 'Booking status updated', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Add payment to booking
export const addPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount } = req.body;

        if (!paymentAmount || Number(paymentAmount) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
        }

        const booking = await WeddingBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.advancePaid += Number(paymentAmount);

        // Auto-update payment status
        if (booking.advancePaid >= booking.totalAmount) booking.paymentStatus = 'Fully Paid';
        else if (booking.advancePaid > 0) booking.paymentStatus = 'Partially Paid';

        // Auto-confirm if 25% paid
        if (booking.bookingStatus === 'pending' && booking.advancePaid >= (booking.totalAmount * 0.25)) {
            booking.bookingStatus = 'confirmed';
        }

        await booking.save();
        return res.status(200).json({ success: true, message: 'Payment added successfully', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update guest count & recalculate total
export const updateGuestCount = async (req, res) => {
    try {
        const { id } = req.params;
        const { guestCount } = req.body;

        if (!guestCount || Number(guestCount) < 1) {
            return res.status(400).json({ success: false, message: 'Valid guest count is required' });
        }

        const booking = await WeddingBooking.findById(id).populate('hallId');
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Recalculate total guest count
        let totalAmount = booking.hallId.price;
        const packagePrices = { 'Silver': 2500, 'Gold': 4000, 'Platinum': 6500 };
        const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
        
        const weddingServicePrices = { 'Decorations': 45000, 'DJ/Music': 35000, 'Photography': 55000, 'Videography': 40000, 'Wedding Cake': 25000, 'Lighting System': 30000, 'Flower Arrangements': 20000 };
        const eventServicePrices = { 'Decorations': 15000, 'DJ/Music': 10000, 'Photography': 15000, 'Videography': 12000, 'Wedding Cake': 8000, 'Lighting System': 8000, 'Flower Arrangements': 5000 };

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
        booking.optionalServices.forEach(s => { totalAmount += servicePrices[s] || 0; });

        // Extra hour charges
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
            totalAmount += Math.ceil(duration - standardHours) * extraHourPrice;
        }

        booking.guestCount = Number(guestCount);
        booking.totalAmount = totalAmount;

        // Update payment status
        if (booking.advancePaid >= booking.totalAmount) booking.paymentStatus = 'Fully Paid';
        else if (booking.advancePaid > 0) booking.paymentStatus = 'Partially Paid';
        else booking.paymentStatus = 'Pending';

        await booking.save();
        return res.status(200).json({ success: true, message: 'Guest count and total updated', data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete booking
export const deleteBookingRequest = async (req, res) => {
    try {
        const booking = await WeddingBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        await booking.deleteOne();
        return res.status(200).json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Check hall availability by date
export const getHallAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: 'Please provide date (YYYY-MM-DD)' });

        const requestedDate = new Date(date);
        if (Number.isNaN(requestedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const blockingBookings = await WeddingBooking.find({
            eventDate: { $gte: startOfDay, $lte: endOfDay },
            bookingStatus: { $in: ['pending', 'confirmed'] }
        }).select('hallId');

        const bookedHallIdSet = new Set(blockingBookings.map(b => b.hallId.toString()));
        const halls = await WeddingHall.find();

        const availability = halls.map(hall => {
            const alreadyBooked = bookedHallIdSet.has(hall._id.toString());
            const isOperational = hall.status === 'available';
            const isAvailable = isOperational && !alreadyBooked;

            return {
                _id: hall._id, hallName: hall.hallName, capacity: hall.capacity,
                price: hall.price, status: hall.status, isAvailable,
                reason: isAvailable ? 'Hall is free' : alreadyBooked ? 'Already booked on this date' : `Hall is ${hall.status}`
            };
        });

        return res.status(200).json({ success: true, date, count: availability.length, data: availability });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get all bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await WeddingBooking.find()
            .populate('hallId', 'hallName capacity price status')
            .sort({ eventDate: 1 });

        return res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get my bookings
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await WeddingBooking.find({ customerId: req.user.id })
            .populate('hallId', 'hallName capacity');
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all halls
export const getHalls = async (req, res) => {
    try {
        const halls = await WeddingHall.find();
        res.status(200).json({ success: true, data: halls });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create hall
export const createHall = async (req, res) => {
    try {
        const { hallName, capacity, price, type, status, image } = req.body;
        if (!hallName || !capacity || !price) {
            return res.status(400).json({ success: false, message: 'Please provide hallName, capacity, and price' });
        }

        const hall = await WeddingHall.create({ hallName, capacity, price, type: type || 'Hall', status: status || 'available', image });
        res.status(201).json({ success: true, message: 'Venue created', data: hall });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update hall
export const updateHall = async (req, res) => {
    try {
        const { hallName, capacity, price, type, status, image } = req.body;
        const hall = await WeddingHall.findByIdAndUpdate(req.params.id, { hallName, capacity, price, type, status, image }, { new: true, runValidators: true });
        if (!hall) return res.status(404).json({ success: false, message: 'Venue not found' });
        res.status(200).json({ success: true, message: 'Venue updated', data: hall });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete hall
export const deleteHall = async (req, res) => {
    try {
        const hall = await WeddingHall.findById(req.params.id);
        if (!hall) return res.status(404).json({ success: false, message: 'Venue not found' });

        const bookingsCount = await WeddingBooking.countDocuments({ hallId: req.params.id });
        if (bookingsCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete venue with existing bookings' });
        }

        await hall.deleteOne();
        res.status(200).json({ success: true, message: 'Venue deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle hall status
export const toggleHallStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['available', 'maintenance', 'occupied', 'unavailable'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const hall = await WeddingHall.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        if (!hall) return res.status(404).json({ success: false, message: 'Venue not found' });

        res.status(200).json({ success: true, message: `Status updated to ${status}`, data: hall });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get monthly booked dates
export const getMonthlyBookedDates = async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ success: false, message: 'Please provide year and month' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const bookings = await WeddingBooking.find({
            eventDate: { $gte: startDate, $lte: endDate },
            bookingStatus: { $in: ['pending', 'confirmed'] }
        }).select('eventDate hallId');

        const dateMap = {};
        bookings.forEach(booking => {
            const dateStr = booking.eventDate.toISOString().split('T')[0];
            if (!dateMap[dateStr]) dateMap[dateStr] = new Set();
            dateMap[dateStr].add(booking.hallId.toString());
        });

        const bookedDates = Object.keys(dateMap).map(date => ({
            date,
            bookedVenuesCount: dateMap[date].size
        }));

        res.status(200).json({ success: true, data: bookedDates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
