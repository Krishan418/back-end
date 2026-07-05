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

const LOCAL_IMAGE_PATH = 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-32 3.jpg';

const updateGallery1 = async () => {
  try {
    console.log('Uploading updated gallery_1 to Cloudinary...');
    const result = await cloudinary.uploader.upload(LOCAL_IMAGE_PATH, {
      folder: 'hotel_janro/gallery',
      public_id: 'gallery_1',
      overwrite: true,
      transformation: [
        { quality: 'auto:best', fetch_format: 'auto' }
      ]
    });
    console.log('\n✅ Upload Successful!');
    console.log('📸 Cloudinary URL:', result.secure_url);
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
};

updateGallery1();
