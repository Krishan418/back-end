import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dns from 'dns';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import User from '../models/user.js';

const verifyAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await User.updateMany(
            {},
            { $set: { isVerified: true } }
        );

        console.log(`Successfully verified ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Error verifying users:', error.message);
        process.exit(1);
    }
};

verifyAllUsers();
