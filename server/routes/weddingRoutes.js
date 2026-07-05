import express from 'express';
import { 
    createBooking, 
    deleteBookingRequest, 
    getHallAvailability, 
    getMonthlyBookedDates,
    updateBookingStatus,
    updateBooking,
    getHalls,
    toggleHallStatus,
    getMyBookings,
    getAllBookings,
    addPayment,
    createHall,
    updateHall,
    deleteHall
} from '../controllers/weddingControllers.js';
import { getPackages, updatePackage, createPackage, deletePackage } from '../controllers/weddingPackageController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or any logged in user)
router.get('/halls/availability', getHallAvailability);
router.get('/halls/booked-dates', getMonthlyBookedDates);
router.get('/halls', getHalls);
router.get('/packages', getPackages);

// Protected routes
router.get('/my-bookings', protect, getMyBookings);

// Admin/Staff routes
router.post('/bookings', protect, authorize('admin', 'receptionist'), createBooking);
router.put('/bookings/:id', protect, authorize('admin', 'receptionist'), updateBooking);
router.get('/bookings', protect, authorize('admin', 'receptionist'), getAllBookings);
router.post('/halls', protect, authorize('admin'), createHall);
router.put('/halls/:id/status', protect, authorize('admin', 'receptionist'), toggleHallStatus);
router.put('/halls/:id', protect, authorize('admin'), updateHall);
router.delete('/halls/:id', protect, authorize('admin'), deleteHall);
router.put('/bookings/:id/status', protect, authorize('admin', 'receptionist'), updateBookingStatus);
router.put('/bookings/:id/payment', protect, addPayment);
router.delete('/bookings/:id', protect, authorize('admin'), deleteBookingRequest);
router.post('/packages', protect, authorize('admin'), createPackage);
router.put('/packages/:id', protect, authorize('admin'), updatePackage);
router.delete('/packages/:id', protect, authorize('admin'), deletePackage);

export default router;
