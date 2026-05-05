import express from 'express';
import { 
    register, 
    login, 
    refresh, 
    getMe, 
    updateUserRole, 
    getAllUsers,
    updateMe,
    updatePassword,
    forgotPassword,
    resetPassword
} from '../controllers/authControllers.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes (any logged-in user)
router.get('/me', protect, getMe);
router.put('/updateme', protect, updateMe);
router.put('/updatepassword', protect, updatePassword);

// Admin-only routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);

export default router;