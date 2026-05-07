
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';
import User from '../models/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const createAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found in env');
        
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@hoteljanro.com';
        const adminPassword = 'adminpassword123';

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists. Resetting password and ensuring verified status...');
            existingAdmin.password = adminPassword;
            existingAdmin.confirmPassword = adminPassword;
            existingAdmin.isVerified = true;
            await existingAdmin.save({ validateBeforeSave: false });
            console.log('Admin updated successfully!');
            process.exit(0);
        }

        // We use create which triggers the pre-save hook for hashing
        await User.create({
            name: 'System Admin',
            email: adminEmail,
            password: adminPassword,
            confirmPassword: adminPassword,
            isVerified: true,
            role: 'admin'
            role: 'admin',
            phone: '0000000000'
        });

        console.log('Admin user created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
