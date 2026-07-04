import express from 'express';
import {
    getAdminRooms,
    getRoomAdminStats,
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    restoreRoom,
    updateRoomAvailability
} from '../controllers/roomController.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router(); //Creates a mini routing system for rooms

router.get('/admin/list', protect, authorize('admin', 'manager', 'receptionist', 'reception'), getAdminRooms); //Get all rooms (admin view)
router.get('/admin/stats', protect, authorize('admin', 'manager', 'receptionist', 'reception'), getRoomAdminStats);

router.get('/', getRooms);//Anyone can view available rooms 
router.get('/:id', getRoomById);

router.post('/', protect, authorize('admin', 'manager'), createRoom);
router.put('/:id', protect, authorize('admin', 'manager', 'receptionist', 'reception'), updateRoom);
router.patch('/:id/availability', protect, authorize('admin', 'manager'), updateRoomAvailability);
router.patch('/:id/restore', protect, authorize('admin'), restoreRoom);
router.delete('/:id', protect, authorize('admin'), deleteRoom);

export default router;
