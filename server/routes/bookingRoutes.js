import express from 'express';
import {
    createBooking,
    getBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelMyBooking,
    abandonMyBooking,
    getMonthlyRevenueReport,
    deleteBooking,
    updateBookingDetails
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

import Booking from '../models/booking.js';
const router = express.Router();

router.post('/', protect, createBooking);

router.get('/my', protect, getMyBookings);
router.get('/reports/monthly-revenue', protect, authorize('admin', 'manager', 'staff'), getMonthlyRevenueReport);
router.patch('/:id/cancel', protect, cancelMyBooking);
router.delete('/:id/abandon', protect, abandonMyBooking);
router.put('/:id', protect, updateBookingDetails);

router.get('/', protect, authorize('admin', 'manager', 'staff', 'receptionist', 'reception'), getBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/status', protect, authorize('admin', 'manager', 'staff', 'receptionist', 'reception'), updateBookingStatus);
router.delete('/:id', protect, authorize('admin', 'manager', 'staff', 'receptionist', 'reception'), deleteBooking);

export default router;
