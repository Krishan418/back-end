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

const upload = async () => {
  try {
    console.log('Uploading Events/Wedding Hall image to Cloudinary...');
    const result = await cloudinary.uploader.upload(
      'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-33 2.jpg',
      {
        folder: 'hotel_janro',
        public_id: 'hotel_event',
        overwrite: true,
        transformation: [{ width: 1200, height: 900, crop: 'fill', gravity: 'auto', quality: 'auto:best', fetch_format: 'auto' }]
      }
    );
    console.log('\n✅ Upload Successful!');
    console.log('📸 URL:', result.secure_url);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

upload();
