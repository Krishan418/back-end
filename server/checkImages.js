import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import MenuItem from './models/MenuItem.js';

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const checkImages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const items = await MenuItem.find({}, 'name image');
        console.log('Menu Items and their Image paths:');
        items.forEach(item => {
            console.log(`- ${item.name}: "${item.image}"`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking images:', error);
        process.exit(1);
    }
};

checkImages();
