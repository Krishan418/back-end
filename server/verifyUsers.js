import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/user.js';
import dns from 'dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const verifyAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await User.updateMany({}, { $set: { isVerified: true } });
        console.log(`Successfully verified ${result.modifiedCount} users.`);

        process.exit(0);
    } catch (error) {
        console.error('Error verifying users:', error);
        process.exit(1);
    }
};

verifyAllUsers();
