import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    confirmPassword: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function(value) {
                return value === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    emergencyContact: {
        type: String,
        trim: true
    },
    emergencyContactPhone: {
        type: String,
        trim: true
    },
    nic: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    employeeId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    salary: {
        type: Number,
        default: 0
    },
    employmentType: {
        type: String,
        enum: ['permanent', 'temporary'],
        default: 'permanent'
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
    startTime: {
        type: String,
        trim: true
    },
    endTime: {
        type: String,
        trim: true
    },
    additionalHours: {
        type: Number,
        default: 0
    },
    bonus: {
        type: Number,
        default: 0
    },
    joinDate: {
        type: Date
    },
    role: {
        type: String,
        lowercase: true,
        enum: ['customer', 'manager', 'admin', 'staff', 'receptionist', 'cashier', 'chef', 'waiter', 'housekeeping', 'security', 'maintenance'],
        default: 'customer'
    },
    status: {
        type: String,
        lowercase: true,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    verificationOTP: String,
    verificationOTPExpire: Date,
    pendingEmail: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.confirmPassword = undefined;
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

export default mongoose.model('User', userSchema);
