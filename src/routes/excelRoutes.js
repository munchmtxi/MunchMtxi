// src/routes/excelRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const excelService = require('../services/excelService');
const emailService = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');

router.post('/export', 
  authenticate, 
  authorizeRoles('admin', 'merchant'),
  catchAsync(async (req, res) => {
    const { reportType, dateRange, filters } = req.body;
    
    const filePath = await excelService.generateScheduledReport({
      reportType,
      dateRange,
      filters
    });
    
    res.download(filePath, `${reportType}_report.xlsx`, async (err) => {
      if (err) {
        logger.error(`Error sending Excel file: ${err.message}`);
      }
      await excelService.cleanup(filePath);
    });
  })
);

router.post('/schedule',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(async (req, res) => {
    const { reportType, frequency, email, filters } = req.body;
    
    // Store schedule in database and set up cron job
    // Implementation depends on your scheduling system
    
    res.status(200).json({ message: 'Report scheduled successfully' });
  })
);

module.exports = router;