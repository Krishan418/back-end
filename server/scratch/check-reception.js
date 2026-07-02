import mongoose from 'mongoose';
import User from '../models/user.js';
import dotenv from 'dotenv';

dotenv.config();

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({ role: { $in: ['receptionist', 'admin'] } });
        console.log('--- Relevant Users ---');
        users.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}, Verified: ${u.isVerified}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkUser();
