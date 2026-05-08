import express from 'express';
import { 
    createBooking, 
    deleteBookingRequest, 
    getHallAvailability, 
    getMonthlyBookedDates,
    updateBookingStatus,
    getHalls,
    toggleHallStatus,
    getMyBookings,
    getAllBookings,
    addPayment,
    updateGuestCount,
    createHall,
    updateHall,
    deleteHall
} from '../controllers/weddingControllers.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or any logged in user)
router.get('/halls/availability', getHallAvailability);
router.get('/halls/booked-dates', getMonthlyBookedDates);

// Protected routes
router.get('/my-bookings', protect, getMyBookings);

// Admin/Staff routes
router.post('/bookings', protect, authorize('admin', 'receptionist'), createBooking);
router.get('/bookings', protect, authorize('admin', 'receptionist'), getAllBookings);
router.get('/halls', protect, authorize('admin', 'receptionist'), getHalls);
router.post('/halls', protect, authorize('admin'), createHall);
router.put('/halls/:id/status', protect, authorize('admin', 'receptionist'), toggleHallStatus);
router.put('/halls/:id', protect, authorize('admin'), updateHall);
router.delete('/halls/:id', protect, authorize('admin'), deleteHall);
router.put('/bookings/:id/status', protect, authorize('admin', 'receptionist'), updateBookingStatus);
router.put('/bookings/:id/payment', protect, authorize('admin', 'receptionist'), addPayment);
router.put('/bookings/:id/guest-count', protect, authorize('admin', 'receptionist'), updateGuestCount);
router.delete('/bookings/:id', protect, authorize('admin'), deleteBookingRequest);

export default router;
