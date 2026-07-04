import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOCAL_IMAGE_PATH = 'C:\\Users\\kavin\\Downloads\\485318139_2071217696718479_6832324276217307596_n.jpg';

const uploadHeroImage = async () => {
  try {
    console.log('Uploading Hotel Janro hero image to Cloudinary...');

    const result = await cloudinary.uploader.upload(LOCAL_IMAGE_PATH, {
      folder: 'hotel_janro',
      public_id: 'hotel_hero',
      overwrite: true,
      transformation: [
        { width: 1920, height: 1080, crop: 'fill', gravity: 'auto', quality: 'auto:best', fetch_format: 'auto' }
      ]
    });

    console.log('\n✅ Upload Successful!');
    console.log('📸 Cloudinary URL:', result.secure_url);
    console.log('\n👉 Copy this URL and paste it back to the chat!');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
};

uploadHeroImage();
