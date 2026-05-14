import User from '../models/user.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/email.js';


const getOTPTemplate = (otp, name) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .email-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
                background-color: #0F172A;
                padding: 40px 20px;
                text-align: center;
            }
            .logo-text {
                color: #D4AF37;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 4px;
                margin: 0;
            }
            .content {
                padding: 40px 30px;
                color: #334155;
                line-height: 1.6;
            }
            .greeting {
                font-size: 18px;
                font-weight: 600;
                color: #0F172A;
                margin-bottom: 20px;
            }
            .otp-container {
                background-color: #F8FAFC;
                border: 2px dashed #D4AF37;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 42px;
                font-weight: 800;
                color: #0F172A;
                letter-spacing: 12px;
                margin: 0;
            }
            .footer {
                background-color: #F8FAFC;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #94A3B8;
            }
            .warning {
                font-size: 13px;
                color: #64748B;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1 class="logo-text">HOTEL JANRO</h1>
            </div>
            <div class="content">
                <p class="greeting">Hello ${name},</p>
                <p>Welcome to Hotel Janro! We're excited to have you with us. To complete your registration and secure your account, please use the verification code below:</p>
                
                <div class="otp-container">
                    <h2 class="otp-code">${otp}</h2>
                </div>
                
                <p>This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                
                <p class="warning">For your security, never share this code with anyone. Our staff will never ask for your verification code.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Hotel Janro. All rights reserved.</p>
                <p>Luxury & Comfort in Every Stay</p>
            </div>
        </div>
    </body>
    </html>
    `;
};


// Register new user
export const register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, password and confirmPassword'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Check user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            confirmPassword,
            phone,
            isVerified: true
        });

        // Generate & hash 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        
        user.verificationOTP = hashedOTP;
        user.verificationOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save({ validateBeforeSave: false });

        // Send OTP via email
        const message = `Welcome to Hotel Janro!\n\nYour email verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
        const html = getOTPTemplate(otp, user.name);
        
        try {
            await sendEmail({
                email: user.email,
                subject: 'Hotel Janro - Verify Your Email',
                message,
                html
            });
        } catch (error) {
            console.error("Failed to send OTP email", error);
        }

        res.status(201).json({
            success: true,
            requireVerification: true,
            message: "Registration successful. Please verify your email."
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// Login user - verify credentials and return JWT tokens
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }


        // Verify password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT tokens
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);


        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// Get logged-in user profile
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['customer', 'manager', 'admin', 'staff'];

        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.role = role;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Refresh access token using refresh token
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh Token is required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const newAccessToken = generateAccessToken(user._id, user.role);

        res.status(200).json({
            success: true,
            token: newAccessToken
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired refresh token. Please login again.' 
        });
    }
};

// Update own profile details
export const updateMe = async (req, res) => {
    try {
        const { name, email, phone, address, emergencyContact } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email, phone, address, emergencyContact },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update password
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Deactivate user (Admin only)
export const deactivateUser = async (req, res) => {
    try {
        const { status } = req.body; // 'active' or 'inactive'
        
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} is now ${status}`,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create staff user (Admin only)
export const createStaff = async (req, res) => {
    try {
        const { name, email, phone, role, department, salary, joinDate, status } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        const allowedRoles = ['staff', 'manager', 'receptionist', 'chef', 'waiter', 'housekeeping', 'security', 'maintenance'];
        const assignedRole = (role || 'staff').toLowerCase();
        if (!allowedRoles.includes(assignedRole)) {
            return res.status(400).json({ success: false, message: 'Invalid role for this endpoint' });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

        const tempPassword = `Staff@${Math.random().toString(36).slice(2,8)}`;

        const user = await User.create({
            name,
            email,
            password: tempPassword,
            confirmPassword: tempPassword,
            phone,
            role: assignedRole,
            department,
            salary,
            joinDate,
            status: status || 'active'
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                department: user.department,
                salary: user.salary,
                joinDate: user.joinDate,
                status: user.status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update user details (Admin only)
export const updateUser = async (req, res) => {
    try {
        const allowed = ['name', 'phone', 'role', 'department', 'salary', 'joinDate', 'status', 'email'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });


        if (updates.role && updates.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Cannot assign admin role via this endpoint' });
        }

        Object.assign(user, updates);
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            department: user.department,
            salary: user.salary,
            joinDate: user.joinDate,
            status: user.status
        }});
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Cannot delete admin users' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Please provide all fields' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New passwords do not match' });
        }

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }


        user.password = newPassword;
        user.confirmPassword = confirmPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }

        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Hotel Janro - Password Reset Token',
                message
            });

            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Email could not be sent. Please check your email configuration.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid token or token has expired' });
        }


        user.password = req.body.password;
        user.confirmPassword = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify Email OTP
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User is already verified' });
        }

        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        if (user.verificationOTP !== hashedOTP) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (user.verificationOTPExpire < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpire = undefined;
        await user.save({ validateBeforeSave: false });

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resend Verification OTP
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User is already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        
        user.verificationOTP = hashedOTP;
        user.verificationOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save({ validateBeforeSave: false });

        const message = `Welcome to Hotel Janro!\n\nYour new email verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
        const html = getOTPTemplate(otp, user.name);
        
        try {
            await sendEmail({
                email: user.email,
                subject: 'Hotel Janro - Verify Your Email',
                message,
                html
            });

            res.status(200).json({ success: true, message: 'A new verification code has been sent to your email.' });
        } catch (error) {
            console.error("Failed to send resend OTP email", error);
            res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Request Email Change
export const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.user.id;

        if (!newEmail) {
            return res.status(400).json({ success: false, message: 'Please provide the new email address' });
        }

        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'This email is already in use' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        user.pendingEmail = newEmail;
        user.verificationOTP = hashedOTP;
        user.verificationOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save({ validateBeforeSave: false });


        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">Confirm Your New Email Address</h2>
                <p>Hello ${user.name},</p>
                <p>You requested to change your email address to <strong>${newEmail}</strong>. Please use the verification code below to confirm this change:</p>
                <div style="background: #F8FAFC; padding: 20px; text-align: center; border: 2px dashed #D4AF37; margin: 20px 0;">
                    <h1 style="letter-spacing: 10px; color: #0F172A; margin: 0;">${otp}</h1>
                </div>
                <p>If you did not request this change, please ignore this email.</p>
                <p style="color: #94A3B8; font-size: 12px;">This code will expire in 10 minutes.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: newEmail,
                subject: 'Hotel Janro - Confirm Email Change',
                message: `Your verification code for email change is: ${otp}`,
                html
            });

            res.status(200).json({ success: true, message: 'Verification code sent to your new email address' });
        } catch (error) {
            console.error("Email change OTP error:", error);
            res.status(500).json({ success: false, message: 'Failed to send verification email' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify Email Change
export const verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.user.id;

        if (!otp) {
            return res.status(400).json({ success: false, message: 'Please provide the verification code' });
        }

        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            _id: userId,
            verificationOTP: hashedOTP,
            verificationOTPExpire: { $gt: Date.now() }
        });

        if (!user || !user.pendingEmail) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }


        user.email = user.pendingEmail;
        user.pendingEmail = undefined;
        user.verificationOTP = undefined;
        user.verificationOTPExpire = undefined;
        user.isVerified = true;

        await user.save({ validateBeforeSave: false });

        res.status(200).json({ 
            success: true, 
            message: 'Email address updated successfully! Please log in again with your new email.',
            data: { email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
