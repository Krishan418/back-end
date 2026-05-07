import express from 'express';
import { 
    createBooking, 
    deleteBookingRequest, 
    getHallAvailability, 
    getMonthlyBookedDates,
    updateBookingStatus,
    getHalls,
    toggleHallStatus,
    getMyBookings
} from '../controllers/weddingControllers.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or any logged in user)
router.get('/halls/availability', getHallAvailability);
router.get('/halls/booked-dates', getMonthlyBookedDates);

// Protected routes
router.post('/bookings', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);

// Admin/Staff routes
router.get('/halls', protect, authorize('admin', 'receptionist'), getHalls);
router.put('/halls/:id/status', protect, authorize('admin'), toggleHallStatus);
router.put('/bookings/:id/status', protect, authorize('admin', 'receptionist'), updateBookingStatus);
router.delete('/bookings/:id', protect, authorize('admin'), deleteBookingRequest);

export default router;
