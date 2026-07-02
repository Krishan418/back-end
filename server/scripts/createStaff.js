import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import dns from 'dns';

dotenv.config({ path: './.env' });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const createStaff = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const staffMembers = [
            {
                name: 'Receptionist',
                email: 'reception@hoteljanro.com',
                password: 'reception123',
                role: 'receptionist',
                phone: '1111111111',
                isVerified: true
            },
            {
                name: 'Cashier',
                email: 'cashier@hoteljanro.com',
                password: 'cashier123',
                role: 'cashier',
                phone: '2222222222',
                isVerified: true
            }
        ];

        for (const staff of staffMembers) {
            const existingUser = await User.findOne({ email: staff.email });
            if (existingUser) {
                existingUser.role = staff.role;
                existingUser.isVerified = true;
                existingUser.password = staff.password;
                existingUser.confirmPassword = staff.password;
                await existingUser.save({ validateBeforeSave: false });
                console.log(`${staff.name} already exists, updated role to ${staff.role}, updated password, and set verified`);
                continue;
            }

            await User.create({
                ...staff,
                confirmPassword: staff.password
            });
            console.log(`${staff.name} created successfully!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating staff:', error.message);
        process.exit(1);
    }
};

createStaff();
