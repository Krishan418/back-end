import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to get settings
router.get('/', getSettings);

// Admin only route to update settings
router.put('/', protect, authorize('admin'), updateSettings);

export default router;
