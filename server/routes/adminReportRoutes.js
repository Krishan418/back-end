import express from 'express';
import { getDashboardReports } from '../controllers/adminReportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get aggregated dashboard reports
// GET /api/reports
router.get('/', getDashboardReports);

export default router;
