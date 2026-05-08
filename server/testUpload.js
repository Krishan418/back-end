import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/menu';

const testImageUpload = async () => {
    try {
        console.log('--- Testing Image Upload ---');
        
        // Find an existing image to use for testing
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(uploadsDir).filter(f => f.match(/\.(jpg|jpeg|png|webp|jfif)$/i));
        
        if (files.length === 0) {
            console.log('No images found in uploads to test with.');
            return;
        }
        
        const testFilePath = path.join(uploadsDir, files[0]);
        const fileBuffer = fs.readFileSync(testFilePath);
        
        const formData = new FormData();
        formData.append('name', 'Upload Test ' + Date.now());
        formData.append('category', 'Main Course');
        formData.append('price', '999');
        formData.append('isAvailable', 'true');
        
        // In Node.js environment, we need to create a Blob from the buffer
        const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
        formData.append('image', blob, 'test-image.jpg');

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error('Upload failed: ' + JSON.stringify(data));
        
        console.log('Upload successful! Item ID:', data._id);
        console.log('Image path in DB:', data.image);

        // Cleanup
        await fetch(`${API_URL}/${data._id}`, { method: 'DELETE' });
        console.log('Cleanup successful');
        
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
};

testImageUpload();
