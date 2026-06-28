import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import MenuItem from '../models/MenuItem.js';
import Room from '../models/room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanupImages = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Get all used images from DB
        const menuItems = await MenuItem.find({}, 'image');
        const rooms = await Room.find({}, 'image');

        const usedImages = new Set();
        
        const processImagePath = (imgPath) => {
            if (!imgPath || typeof imgPath !== 'string') return;
            if (imgPath.startsWith('http')) return; // Skip external URLs
            
            // Extract filename from path (e.g., "/uploads/img.jpg" -> "img.jpg")
            const filename = path.basename(imgPath);
            usedImages.add(filename);
        };

        menuItems.forEach(item => processImagePath(item.image));
        rooms.forEach(room => processImagePath(room.image));

        console.log(`Used images in DB: ${usedImages.size}`);

        // 2. List all files in uploads directory
        if (!fs.existsSync(uploadsDir)) {
            console.log('Uploads directory does not exist.');
            process.exit(0);
        }

        const filesInUploads = fs.readdirSync(uploadsDir);
        console.log(`Files in uploads folder: ${filesInUploads.length}`);

        // 3. Compare and delete
        let deletedCount = 0;
        filesInUploads.forEach(file => {
            // Ignore hidden files or .gitkeep
            if (file.startsWith('.') || file === 'placeholder.png') return;

            if (!usedImages.has(file)) {
                const filePath = path.join(uploadsDir, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted unused image: ${file}`);
                    deletedCount++;
                } catch (err) {
                    console.error(`Error deleting ${file}:`, err.message);
                }
            }
        });

        console.log(`\nCleanup complete!`);
        console.log(`Total files deleted: ${deletedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanupImages();
