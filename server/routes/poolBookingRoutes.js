import express from 'express';
import { createPoolBooking, listPoolBookings, updatePoolBooking, deletePoolBooking } from '../controllers/poolBookingController.js';

const router = express.Router();

router.get('/', listPoolBookings);
router.post('/', createPoolBooking);
router.put('/:id', updatePoolBooking);
router.delete('/:id', deletePoolBooking);

export default router;