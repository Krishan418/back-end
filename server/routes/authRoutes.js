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
    resetPassword,
    deactivateUser,
    createStaff,
    updateUser,
    deleteUser,
    changePassword,
    verifyEmail,
    resendOTP,
    requestEmailChange,
    verifyEmailChange
} from '../controllers/authControllers.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updateme', protect, updateMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/change-password', protect, changePassword);
router.post('/request-email-change', protect, requestEmailChange);
router.post('/verify-email-change', protect, verifyEmailChange);

// Admin-only routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/users/:id/status', protect, authorize('admin'), deactivateUser);
router.post('/users', protect, authorize('admin'), createStaff);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

export default router;
