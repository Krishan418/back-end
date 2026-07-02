
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import dns from 'dns';

dotenv.config({ path: './.env' });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@hoteljanro.com';
        const adminPassword = 'adminpassword123';

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        // We use create which triggers the pre-save hook for hashing
        await User.create({
            name: 'System Admin',
            email: adminEmail,
            password: adminPassword,
            confirmPassword: adminPassword,
<<<<<<< HEAD
=======
            isVerified: true,
>>>>>>> b21474de05b992daa8352e070578169a5ae6a541
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
