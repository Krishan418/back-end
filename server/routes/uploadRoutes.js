import express from 'express';
import upload from '../utils/upload.js';

const router = express.Router();

// @desc    Upload a single file
// @route   POST /api/upload
// @access  Private 
router.post('/', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Construct the URL to the uploaded file
    // Note: In production, you might want to use a full URL with domain
    const imageUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        url: imageUrl
    });
});

export default router;
