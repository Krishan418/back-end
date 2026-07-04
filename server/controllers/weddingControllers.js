import WeddingHall from '../models/weddingHall.js';
import WeddingBooking from '../models/weddingBooking.js';
import sendEmail from '../utils/email.js';

// Create a new booking
export const createBooking = async (req, res) => {
    try {
        const { 
            eventDate, hallId, guestCount,
            eventType, startTime, endTime, 
            groomName, groomPhone, brideName, bridePhone, nekathTimes, seatingStyle, dietaryNotes, corkageIncluded,
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

        // Reject past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        requestedDate.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            return res.status(400).json({ success: false, message: 'Event date cannot be in the past. Please choose a future date.' });
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
            const weddingPackagePrices = {
                '100 Pax Package': 4750,
                '150 Pax Package': 4450,
                '200 Pax Package': 3850,
                '250 Pax Package': 3750
            };
            if (weddingPackagePrices[cateringPackage]) {
                totalAmount += weddingPackagePrices[cateringPackage] * Number(guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += Number(customPackagePrice) * Number(guestCount);
            }
        } else {
            // Events can use the event catering packages OR individual meals
            const eventPackagePrices = {
                'Lunch With Pool': 2415,
                'Menu I': 2900,
                'Menu II': 2750
            };
            if (cateringPackage && eventPackagePrices[cateringPackage]) {
                totalAmount += eventPackagePrices[cateringPackage] * Number(guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += Number(customPackagePrice) * Number(guestCount);
            } else {
                // Fallback to individual meals
                const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
                selectedMeals.forEach(meal => {
                    if (mealPrices[meal]) totalAmount += mealPrices[meal] * Number(guestCount);
                });
            }
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
            groomName, groomPhone, brideName, bridePhone, nekathTimes, seatingStyle, dietaryNotes,
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
            groomName, groomPhone, brideName, bridePhone, nekathTimes, seatingStyle, dietaryNotes, corkageIncluded,
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

        if (bookingCategory === 'Wedding') {
            const weddingPackagePrices = {
                '100 Pax Package': 4750,
                '150 Pax Package': 4450,
                '200 Pax Package': 3850,
                '250 Pax Package': 3750
            };
            if (weddingPackagePrices[cateringPackage]) {
                totalAmount += (weddingPackagePrices[cateringPackage] * guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += (Number(customPackagePrice) * guestCount);
            }
        } else {
            const eventPackagePrices = {
                'Lunch With Pool': 2415,
                'Menu I': 2900,
                'Menu II': 2750
            };
            if (cateringPackage && eventPackagePrices[cateringPackage]) {
                totalAmount += (eventPackagePrices[cateringPackage] * guestCount);
            } else if (cateringPackage === 'Custom') {
                totalAmount += (Number(customPackagePrice) * guestCount);
            } else {
                const mealPrices = { 'Breakfast': 800, 'Lunch': 1500, 'Tea Time': 600, 'Dinner': 1800 };
                selectedMeals.forEach(meal => {
                    if (mealPrices[meal]) totalAmount += (mealPrices[meal] * guestCount);
                });
            }
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
            groomName, groomPhone, brideName, bridePhone, nekathTimes, seatingStyle, dietaryNotes,
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

        if (bookingStatus === 'confirmed') {
            try {
                const bookingIdStr = booking._id ? String(booking._id).slice(-8).toUpperCase() : 'N/A';
                const eventDateStr = new Date(booking.eventDate).toLocaleDateString();
                const hallName = booking.hallId?.hallName || 'Event Venue';
                
                const subject = 'Booking Confirmed - Hotel Janro';
                const message = `Booking Confirmed!\n\nDear ${booking.customerName},\n\nYour booking has been successfully confirmed.\n\nBooking ID: EV${bookingIdStr}\nEvent Venue: ${hallName}\nEvent Date: ${eventDateStr}\nTime: ${booking.startTime} - ${booking.endTime}\nGuests: ${booking.guestCount}\nTotal Price: Rs. ${booking.totalAmount.toLocaleString()}\nPayment Status: ${booking.paymentStatus}\n\nWe look forward to hosting you.\n\nThank you,\nHotel Janro`;
                
                const htmlContent = `
					<h2>Booking Confirmed!</h2>
					<p>Dear ${booking.customerName},</p>
					<p>Your booking has been successfully confirmed.</p>
					<p>
						<strong>Booking ID:</strong> EV${bookingIdStr}<br/>
						<strong>Event Venue:</strong> ${hallName}<br/>
						<strong>Event Date:</strong> ${eventDateStr}<br/>
						<strong>Time:</strong> ${booking.startTime} - ${booking.endTime}<br/>
						<strong>Guests:</strong> ${booking.guestCount}<br/>
						<strong>Total Price:</strong> Rs. ${booking.totalAmount.toLocaleString()}<br/>
						<strong>Payment Status:</strong> ${booking.paymentStatus}
					</p>
					<p>We look forward to hosting you.</p>
					<p>Thank you,<br/>Hotel Janro</p>
				`;

                await sendEmail({
                    email: booking.customerEmail,
                    subject,
                    message,
                    html: htmlContent
                });
            } catch (error) {
                console.error('Failed to send wedding status update email', error);
            }
        }

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
        const normalizedEmail = String(req.user.email).trim().toLowerCase();
        const bookings = await WeddingBooking.find({
            $or: [
                { customerId: req.user._id },
                { customerEmail: normalizedEmail }
            ]
        })
            .populate('hallId', 'hallName capacity price image');
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
        const { hallName, capacity, price, type, status, image, location } = req.body;
        if (!hallName || !capacity || !price) {
            return res.status(400).json({ success: false, message: 'Please provide hallName, capacity, and price' });
        }

        const hall = await WeddingHall.create({ hallName, capacity, price, type: type || 'Hall', status: status || 'available', image, location });
        res.status(201).json({ success: true, message: 'Venue created', data: hall });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update hall
export const updateHall = async (req, res) => {
    try {
        const { hallName, capacity, price, type, status, image, location } = req.body;
        const hall = await WeddingHall.findByIdAndUpdate(req.params.id, { hallName, capacity, price, type, status, image, location }, { returnDocument: 'after', runValidators: true });
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

        const hall = await WeddingHall.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after', runValidators: true });
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
