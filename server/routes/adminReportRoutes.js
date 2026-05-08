import express from 'express';
import { getDashboardReports, exportReport } from '../controllers/adminReportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get aggregated dashboard reports
// GET /api/reports
router.get('/', getDashboardReports);

// Route to export dashboard reports
// POST /api/reports/export
router.post('/export', exportReport);

export default router;
