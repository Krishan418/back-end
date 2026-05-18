import mongoose from 'mongoose';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        const user = await User.findOneAndUpdate(
            { email: 'saduni@gmail.com' },
            { password: hashedPassword },
            { new: true }
        );

        if (user) {
            console.log('Password reset successful for saduni@gmail.com');
        } else {
            console.log('User not found');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

resetPassword();
