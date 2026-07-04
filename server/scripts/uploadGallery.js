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

const GALLERY_IMAGES = [
  { localPath: 'C:\\Users\\kavin\\Downloads\\78756075040.jpg',                                  publicId: 'gallery_1' },
  { localPath: 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-12.jpg',     publicId: 'gallery_2' },
  { localPath: 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-33.jpg',     publicId: 'gallery_3' },
  { localPath: 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-29.jpg',     publicId: 'gallery_4' },
  { localPath: 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-30 3.jpg',   publicId: 'gallery_5' },
  { localPath: 'D:\\Education Works\\GitHub Works\\Images\\PHOTO-2026-07-02-15-24-17.jpg',     publicId: 'gallery_6' },
];

const uploadGallery = async () => {
  const urls = [];

  for (const img of GALLERY_IMAGES) {
    try {
      console.log(`Uploading ${img.publicId}...`);
      const result = await cloudinary.uploader.upload(img.localPath, {
        folder: 'hotel_janro/gallery',
        public_id: img.publicId,
        overwrite: true,
        transformation: [
          { quality: 'auto:best', fetch_format: 'auto' }
        ]
      });
      urls.push(result.secure_url);
      console.log(`  ✅ ${img.publicId}: ${result.secure_url}`);
    } catch (err) {
      console.error(`  ❌ Failed ${img.publicId}: ${err.message}`);
      urls.push(null);
    }
  }

  console.log('\n\n=== ALL URLS ===');
  urls.forEach((url, i) => console.log(`gallery_${i + 1}: ${url}`));
};

uploadGallery();
