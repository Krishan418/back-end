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
    googleLogin,
    setup2FA,
    verify2FA,
    disable2FA,
    verifyLogin2FA
} from '../controllers/authControllers.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/login-2fa', verifyLogin2FA);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updateme', protect, updateMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/change-password', protect, changePassword);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

// Admin-only routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/users/:id/status', protect, authorize('admin'), deactivateUser);
router.post('/users', protect, authorize('admin'), createStaff);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

export default router;
