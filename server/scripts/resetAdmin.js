import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import dns from 'dns';

dotenv.config();
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@hoteljanro.com';
        const newPassword = 'adminpassword123';

        const admin = await User.findOne({ email: adminEmail });
        
        if (!admin) {
            console.log('Admin not found! Creating new one...');
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: newPassword,
                role: 'admin'
            });
            console.log('Admin created successfully');
        } else {
            console.log('Admin found, resetting password...');
            admin.password = newPassword;
            admin.confirmPassword = newPassword; // Added to pass validation
            await admin.save();
            console.log('Admin password reset successfully');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetAdmin();
