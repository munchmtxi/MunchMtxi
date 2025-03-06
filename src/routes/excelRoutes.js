'use strict';
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('@middleware/authMiddleware');
const excelService = require('@services/excelService');
const emailService = require('@services/emailService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');
const cron = require('node-cron');
const { ReportSchedule, Report } = require('@models');
const { Op } = require('sequelize');

router.post('/export',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(async (req, res) => {
    const { reportType, dateRange, filters } = req.body;
    logger.info(`Export request received for ${reportType} by user ${req.user.id}`);
    const { filePath, data } = await excelService.generateScheduledReport({
      reportType,
      dateRange,
      filters,
      userId: req.user.id
    });
    await Report.create({ report_type: reportType, data, generated_by: req.user.id });
    res.download(filePath, `${reportType}_report.xlsx`, async (err) => {
      if (err) logger.error({ message: 'Error sending Excel file', error: err.message, userId: req.user.id, timestamp: new Date().toISOString(), context: 'excelExport' });
      await excelService.cleanup(filePath);
    });
  })
);

router.post('/schedule',
  authenticate,
  authorizeRoles('admin', 'merchant'),
  catchAsync(async (req, res) => {
    const { reportType, frequency, email, filters } = req.body;
    const merchantId = req.user.role === 'merchant' ? req.user.merchantId : null;
    const schedule = await ReportSchedule.create({
      user_id: req.user.id,
      merchant_id: merchantId,
      report_type: reportType,
      frequency,
      email,
      filters: filters ? JSON.stringify(filters) : null,
      next_run_at: new ReportSchedule().calculateNextRunDate(),
      status: 'active'
    });
    logger.info(`Report scheduled: ${reportType} (${frequency}) for user ${req.user.id}, merchant ${merchantId || 'N/A'}`);
    res.status(200).json({ message: 'Report scheduled successfully', scheduleId: schedule.id });
  })
);

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const dueSchedules = await ReportSchedule.findAll({
      where: { next_run_at: { [Op.lte]: now }, status: 'active' }
    });
    for (const schedule of dueSchedules) {
      try {
        logger.info(`Running scheduled report ${schedule.report_type} for user ${schedule.user_id}`);
        const { filePath, data } = await excelService.generateScheduledReport({
          reportType: schedule.report_type,
          dateRange: { start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: now },
          filters: schedule.filters ? JSON.parse(schedule.filters) : {},
          userId: schedule.user_id
        });
        await Report.create({ report_type: schedule.report_type, data, generated_by: schedule.user_id });
        await emailService.sendEmail({
          to: schedule.email,
          subject: `${schedule.report_type} Report - ${now.toLocaleDateString()}`,
          text: 'Attached is your scheduled report.'
        });
        schedule.last_run_at = now;
        schedule.next_run_at = schedule.calculateNextRunDate();
        await schedule.save();
        await excelService.cleanup(filePath);
        logger.info(`Scheduled report ${schedule.report_type} sent to ${schedule.email}`);
      } catch (error) {
        schedule.status = 'failed';
        schedule.error_log = error.message;
        await schedule.save();
        logger.error({ message: 'Scheduled report failed', error: error.message, scheduleId: schedule.id, userId: schedule.user_id, timestamp: new Date().toISOString(), context: 'excelSchedule' });
      }
    }
  } catch (error) {
    logger.error({ message: 'Cron job for report schedules failed', error: error.message, timestamp: new Date().toISOString(), context: 'excelCron' });
  }
});

const loadSchedules = async () => {
  const schedules = await ReportSchedule.count({ where: { status: 'active' } });
  logger.info(`Loaded ${schedules} active report schedules`);
};
loadSchedules();

module.exports = router;