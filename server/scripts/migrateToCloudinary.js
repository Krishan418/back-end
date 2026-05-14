import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import MenuItem from '../models/MenuItem.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import dns from 'dns';

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const items = await MenuItem.find({ image: /^uploads\// });
    console.log(`📂 Found ${items.length} items with local images to migrate.`);

    for (const item of items) {
      const localPath = path.join(process.cwd(), item.image);
      
      if (fs.existsSync(localPath)) {
        console.log(`⬆️ Uploading: ${item.name} (${item.image})`);
        
        try {
          const result = await cloudinary.uploader.upload(localPath, {
            folder: 'hotel_janro_menu',
          });

          // Update the database with the Cloudinary URL
          item.image = result.secure_url;
          await item.save();
          console.log(`✅ Success: ${item.name} -> ${result.secure_url}`);
        } catch (uploadErr) {
          console.error(`❌ Failed to upload ${item.name}:`, uploadErr.message);
        }
      } else {
        console.warn(`⚠️ File not found: ${localPath}`);
      }
    }

    console.log('✨ Migration Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
}

migrate();
