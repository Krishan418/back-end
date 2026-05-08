import express from 'express';
import {
    createBooking,
    getBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelMyBooking,
    getMonthlyRevenueReport,
    deleteBooking
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createBooking);

router.get('/my', protect, getMyBookings);
router.get('/reports/monthly-revenue', protect, authorize('admin', 'manager', 'staff'), getMonthlyRevenueReport);
router.patch('/:id/cancel', protect, cancelMyBooking);

router.get('/', protect, authorize('admin', 'manager', 'staff'), getBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/status', protect, authorize('admin', 'manager', 'staff'), updateBookingStatus);
router.delete('/:id', protect, authorize('admin', 'manager', 'staff'), deleteBooking);

export default router;
