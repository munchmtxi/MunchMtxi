// src/routes/excelRoutes.js
const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

router.post('/export', 
  authenticate, 
  authorizeRoles('admin', 'merchant'),
  catchAsync(excelController.exportReport.bind(excelController))
);

router.post('/schedule',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(excelController.scheduleReport.bind(excelController))
);

router.get('/schedules',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(excelController.getSchedules.bind(excelController))
);

router.patch('/schedules/:scheduleId',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(excelController.updateSchedule.bind(excelController))
);

router.delete('/schedules/:scheduleId',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(excelController.deleteSchedule.bind(excelController))
);

module.exports = router;