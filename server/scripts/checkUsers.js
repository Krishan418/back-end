import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import dns from 'dns';

dotenv.config({ path: './.env' });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find();
        console.log('Total users in database:', users.length);
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkUsers();
