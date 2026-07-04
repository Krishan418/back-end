import express from 'express';
import { getDashboardReports, exportReport, downloadReport } from '../controllers/adminReportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get aggregated dashboard reports
// GET /api/reports
router.get('/', getDashboardReports);

// Route to export dashboard reports
// POST /api/reports/export
router.post('/export', exportReport);

// Route to download dashboard reports as CSV
// GET /api/reports/download
router.get('/download', downloadReport);

export default router;
