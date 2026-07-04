import User from '../models/user.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/email.js';
import Settings from '../models/Settings.js';
import { generateSecret, verifyTOTP } from '../utils/totp.js';


const getOTPTemplate = (otp, name, hotelName = 'Hotel Janro') => {
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
                <h1 class="logo-text">${hotelName.toUpperCase()}</h1>
            </div>
            <div class="content">
                <p class="greeting">Hello ${name},</p>
                <p>Welcome to ${hotelName}! We're excited to have you with us. To complete your registration and secure your account, please use the verification code below:</p>
                
                <div class="otp-container">
                    <h2 class="otp-code">${otp}</h2>
                </div>
                
                <p>This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                
                <p class="warning">For your security, never share this code with anyone. Our staff will never ask for your verification code.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.</p>
                <p>Luxury & Comfort in Every Stay</p>
            </div>
        </div>
    </body>
    </html>
    `;
};


const getStaffWelcomeTemplate = (name, email, role, password, hotelName = 'Hotel Janro') => {
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
                font-size: 22px;
                font-weight: 700;
                color: #0F172A;
                margin-bottom: 20px;
                text-align: center;
            }
            .info-box {
                background-color: #F8FAFC;
                border-left: 4px solid #D4AF37;
                border-radius: 8px;
                padding: 25px;
                margin: 25px 0;
            }
            .footer {
                background-color: #F8FAFC;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #94A3B8;
            }
            .highlight {
                color: #D4AF37;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1 class="logo-text">${hotelName.toUpperCase()}</h1>
            </div>
            <div class="content">
                <p class="greeting">Congratulations, ${name}!</p>
                <p>Welcome to the <span class="highlight">${hotelName}</span> team. We are thrilled to have you join us. You have been assigned the role of <strong>${role}</strong>.</p>
                
                <div class="info-box">
                    <p style="margin-top: 0;"><strong>Your Account Credentials:</strong></p>
                    <p><strong>Email Address:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
                </div>
                
                <p>Please log in using your email and the temporary password provided above. For security reasons, we strongly recommend changing your password immediately after your first login.</p>
                
                <p>We look forward to working with you and seeing your contributions to our success!</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${hotelName}. All rights reserved.</p>
                <p>Excellence in Hospitality</p>
            </div>
        </div>
    </body>
    </html>
    `;
};


// Register new user (always registers as 'customer')
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

        // Fetch settings for hotel name
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.hotelName;

        // Send OTP via email
        const message = `Welcome to ${hotelName}!\n\nYour email verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
        const html = getOTPTemplate(otp, user.name, hotelName);
        
        try {
            await sendEmail({
                email: user.email,
                subject: `${hotelName} - Verify Your Email`,
                message,
                html,
                hotelName
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

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Check if user is active (Case-insensitive check)
        if (user.status && user.status.toLowerCase() !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                success: false,
                requireVerification: true,
                message: 'Please verify your email address before logging in.'
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

        // Check if two-factor is active
        if (user.twoFactorEnabled) {
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                userId: user._id
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

// Google login is not wired up yet; keep the route import valid and return a clear response.
export const googleLogin = async (req, res) => {
    return res.status(501).json({
        success: false,
        message: 'Google login is not implemented yet.'
    });
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

        if (role.toLowerCase() === 'admin' && user.role.toLowerCase() !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount >= 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum limit of 2 admins has been reached. Cannot promote another user to admin.'
                });
            }
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

        // Generate a new Access Token (50 min)

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
        const { 
            name, email, phone, role, department, salary, joinDate, status,
            nic, employeeId, address, emergencyContact, emergencyContactPhone,
            employmentType, hourlyRate, startTime, endTime, additionalHours, bonus,
            password
        } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!name || !normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        // Email Validation
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }

        // Phone Validation (Allow full phone number with international country codes)
        const phoneRegex = /^\+?[0-9\s\-()]{9,20}$/;
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid phone number' });
        }

        // NIC Validation (9 digits + V/X or 12 digits)
        if (!nic) {
            return res.status(400).json({ success: false, message: 'NIC number is required' });
        }
        const nicRegex = /^(?:\d{9}[vVxX]|\d{12})$/;
        if (!nicRegex.test(nic)) {
            return res.status(400).json({ success: false, message: 'Invalid NIC format. Use 9 digits + V/X or 12 digits' });
        }

        const allowedRoles = ['staff', 'manager', 'receptionist', 'cashier', 'chef', 'waiter', 'housekeeping', 'security', 'maintenance', 'admin'];
        const assignedRole = (role || 'staff').toLowerCase();
        if (!allowedRoles.includes(assignedRole)) {
            return res.status(400).json({ success: false, message: 'Invalid role for this endpoint' });
        }

        if (assignedRole === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount >= 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum limit of 2 admins has been reached. Cannot create another admin account.'
                });
            }
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

        if (joinDate && new Date(joinDate) > new Date()) {
            return res.status(400).json({ success: false, message: 'Join date cannot be in the future' });
        }

        let finalEmployeeId = employeeId;
        if (!finalEmployeeId) {
            let count = await User.countDocuments({ role: { $in: ['staff', 'manager', 'receptionist', 'cashier', 'chef', 'waiter', 'housekeeping', 'security', 'maintenance', 'admin'] } });
            let generatedId = `STF-${String(count + 1).padStart(3, '0')}`;
            let exists = await User.findOne({ employeeId: generatedId });
            while (exists) {
                count++;
                generatedId = `STF-${String(count + 1).padStart(3, '0')}`;
                exists = await User.findOne({ employeeId: generatedId });
            }
            finalEmployeeId = generatedId;
        }

        const tempPassword = password || `Staff@${Math.random().toString(36).slice(2,8)}`;

        const user = await User.create({
            name,
            email: normalizedEmail,
            password: tempPassword,
            confirmPassword: tempPassword,
            phone,
            role: assignedRole,
            department,
            salary,
            joinDate,
            status: status || 'active',
            nic,
            employeeId: finalEmployeeId,
            address,
            emergencyContact,
            emergencyContactPhone,
            employmentType: employmentType || 'permanent',
            hourlyRate: hourlyRate || 0,
            startTime,
            endTime,
            additionalHours: additionalHours || 0,
            bonus: bonus || 0,
            isVerified: true
        });

        // Fetch settings for hotel name
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.hotelName;

        // Send Welcome email with credentials
        const message = `Congratulations ${name}! Welcome to the ${hotelName} team as a ${assignedRole}. Your login email is: ${normalizedEmail} and temporary password is: ${tempPassword}`;
        const html = getStaffWelcomeTemplate(name, normalizedEmail, assignedRole, tempPassword, hotelName);
        
        // Check if SMTP email credentials are configured
        const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
        const emailPort = process.env.EMAIL_PORT || process.env.SMTP_PORT;
        const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
        const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
        const smtpReady = Boolean(
            emailHost &&
            emailPort &&
            emailUser &&
            emailPass &&
            !['localhost', '127.0.0.1'].includes(String(emailHost))
        );

        let emailSent = false;
        const canSendWelcomeEmail = settings.notifications?.staffUpdates !== false;
        if (smtpReady && canSendWelcomeEmail) {
            emailSent = true;
            // Send email in the background asynchronously without awaiting it
            sendEmail({
                email: user.email,
                subject: `Congratulations! Welcome to ${hotelName}`,
                message,
                html
            }).catch(emailError => {
                console.error('Failed to send welcome email:', emailError);
            });
        }

        res.status(201).json({
            success: true,
            emailSent,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                department: user.department,
                salary: user.salary,
                joinDate: user.joinDate,
                status: user.status,
                nic: user.nic,
                employeeId: user.employeeId,
                address: user.address,
                emergencyContact: user.emergencyContact,
                emergencyContactPhone: user.emergencyContactPhone,
                employmentType: user.employmentType,
                hourlyRate: user.hourlyRate,
                startTime: user.startTime,
                endTime: user.endTime,
                additionalHours: user.additionalHours,
                bonus: user.bonus,
                tempPassword
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update user details (Admin only)
export const updateUser = async (req, res) => {
    try {
        const allowed = [
            'name', 'phone', 'role', 'department', 'salary', 'joinDate', 'status', 'email',
            'nic', 'employeeId', 'address', 'emergencyContact', 'emergencyContactPhone',
            'employmentType', 'hourlyRate', 'startTime', 'endTime', 'additionalHours', 'bonus'
        ];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        // Email Validation if being updated
        if (updates.email) {
            const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(updates.email)) {
                return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
            }
        }

        // Phone Validation if being updated
        if (updates.phone) {
            const phoneRegex = /^\+?[0-9\s\-()]{9,20}$/;
            if (!phoneRegex.test(updates.phone)) {
                return res.status(400).json({ success: false, message: 'Please provide a valid phone number' });
            }
        }

        // NIC Validation if being updated
        if (updates.nic !== undefined) {
            if (!updates.nic) {
                return res.status(400).json({ success: false, message: 'NIC number is required' });
            }
            const nicRegex = /^(?:\d{9}[vVxX]|\d{12})$/;
            if (!nicRegex.test(updates.nic)) {
                return res.status(400).json({ success: false, message: 'Invalid NIC format' });
            }
        }

        // Join Date validation if being updated
        if (updates.joinDate && new Date(updates.joinDate) > new Date()) {
            return res.status(400).json({ success: false, message: 'Join date cannot be in the future' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });


        if (updates.role && updates.role.toLowerCase() === 'admin') {
            if (user.role.toLowerCase() !== 'admin') {
                const adminCount = await User.countDocuments({ role: 'admin' });
                if (adminCount >= 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'Maximum limit of 2 admins has been reached. Cannot promote another user to admin.'
                    });
                }
            }
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
            status: user.status,
            nic: user.nic,
            employeeId: user.employeeId,
            address: user.address,
            emergencyContact: user.emergencyContact,
            emergencyContactPhone: user.emergencyContactPhone,
            employmentType: user.employmentType,
            hourlyRate: user.hourlyRate,
            startTime: user.startTime,
            endTime: user.endTime,
            additionalHours: user.additionalHours,
            bonus: user.bonus
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
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Cannot delete your own admin account.' });
            }
            if (user.email === 'admin@hoteljanro.com') {
                return res.status(403).json({ success: false, message: 'Cannot delete the primary system admin account.' });
            }
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

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password cannot be the same as the current password' });
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

        // Fetch settings for hotel name
        const settings = await Settings.findOne() || { hotelName: 'Hotel Janro' };
        const hotelName = settings.hotelName;

        try {
            await sendEmail({
                email: user.email,
                subject: `${hotelName} - Password Reset Token`,
                message,
                hotelName
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

// Setup 2FA
export const setup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const secret = generateSecret();
        const email = user.email;
        const otpauthUrl = `otpauth://totp/HotelJanro:${encodeURIComponent(email)}?secret=${secret}&issuer=HotelJanro`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

        res.status(200).json({
            success: true,
            secret,
            qrCodeUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify & Enable 2FA
export const verify2FA = async (req, res) => {
    try {
        const { secret, code } = req.body;
        
        if (!secret || !code) {
            return res.status(400).json({ success: false, message: 'Secret and verification code are required' });
        }

        const isValid = verifyTOTP(secret, code);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        const user = await User.findById(req.user._id).select('+twoFactorSecret');
        user.twoFactorSecret = secret;
        user.twoFactorEnabled = true;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Two-Factor Authentication enabled successfully!'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.twoFactorSecret = undefined;
        user.twoFactorEnabled = false;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Two-Factor Authentication disabled successfully.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify Login 2FA
export const verifyLogin2FA = async (req, res) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ success: false, message: 'User ID and verification code are required' });
        }

        const user = await User.findById(userId).select('+twoFactorSecret');
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Invalid request or 2FA not active' });
        }

        const isValid = verifyTOTP(user.twoFactorSecret, code);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

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
        res.status(500).json({ success: false, message: error.message });
    }
};

