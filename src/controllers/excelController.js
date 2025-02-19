// src/controllers/excelController.js
const excelService = require('../services/excelService');
const emailService = require('../services/emailService');
const ReportSchedule = require('../models/reportSchedule');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { addJobToQueue } = require('../utils/queue');

class ExcelController {
  /**
   * Generate and download Excel report
   */
  async exportReport(req, res, next) {
    try {
      const { reportType, dateRange, filters } = req.body;

      // Validate request parameters
      if (!reportType || !dateRange) {
        throw new AppError('Missing required parameters', 400);
      }

      if (!this.isValidDateRange(dateRange)) {
        throw new AppError('Invalid date range', 400);
      }

      // Generate report
      const filePath = await excelService.generateScheduledReport({
        reportType,
        dateRange,
        filters
      });

      // Set appropriate headers for download
      res.download(filePath, `${reportType}_report.xlsx`, async (err) => {
        if (err) {
          logger.error(`Error sending Excel file: ${err.message}`);
        }
        // Cleanup temporary file after download
        await excelService.cleanup(filePath);
      });
    } catch (error) {
      // Ensure cleanup happens even if there's an error
      if (error.filePath) {
        await excelService.cleanup(error.filePath);
      }
      next(error);
    }
  }

  /**
   * Schedule periodic report generation and email delivery
   */
  async scheduleReport(req, res, next) {
    try {
      const { reportType, frequency, email, filters, schedule } = req.body;

      // Validate request parameters
      if (!reportType || !frequency || !email) {
        throw new AppError('Missing required parameters', 400);
      }

      if (!emailService.isValidEmail(email)) {
        throw new AppError('Invalid email address', 400);
      }

      // Validate schedule format based on frequency
      if (!this.isValidSchedule(frequency, schedule)) {
        throw new AppError('Invalid schedule format', 400);
      }

      // Create report schedule record
      const reportSchedule = await ReportSchedule.create({
        userId: req.user.id,
        reportType,
        frequency,
        email,
        filters,
        schedule,
        status: 'ACTIVE'
      });

      // Add to job queue
      await addJobToQueue('generateScheduledReport', {
        scheduleId: reportSchedule.id,
        reportType,
        frequency,
        email,
        filters,
        schedule
      });

      res.status(200).json({
        status: 'success',
        message: 'Report scheduled successfully',
        data: {
          scheduleId: reportSchedule.id,
          nextRunTime: this.calculateNextRunTime(frequency, schedule)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update existing report schedule
   */
  async updateSchedule(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { frequency, email, filters, schedule, status } = req.body;

      const reportSchedule = await ReportSchedule.findByPk(scheduleId);

      if (!reportSchedule) {
        throw new AppError('Schedule not found', 404);
      }

      if (reportSchedule.userId !== req.user.id) {
        throw new AppError('Unauthorized access to schedule', 403);
      }

      // Update schedule
      await reportSchedule.update({
        frequency,
        email,
        filters,
        schedule,
        status
      });

      // Update job in queue
      if (status === 'ACTIVE') {
        await addJobToQueue('generateScheduledReport', {
          scheduleId: reportSchedule.id,
          reportType: reportSchedule.reportType,
          frequency,
          email,
          filters,
          schedule
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Schedule updated successfully',
        data: reportSchedule
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all report schedules for user
   */
  async getSchedules(req, res, next) {
    try {
      const schedules = await ReportSchedule.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({
        status: 'success',
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete report schedule
   */
  async deleteSchedule(req, res, next) {
    try {
      const { scheduleId } = req.params;

      const schedule = await ReportSchedule.findByPk(scheduleId);

      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }

      if (schedule.userId !== req.user.id) {
        throw new AppError('Unauthorized access to schedule', 403);
      }

      await schedule.destroy();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate date range
   */
  isValidDateRange(dateRange) {
    const { start, end } = dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);

    return (
      startDate instanceof Date && !isNaN(startDate) &&
      endDate instanceof Date && !isNaN(endDate) &&
      startDate <= endDate &&
      endDate <= new Date()
    );
  }

  /**
   * Validate schedule format based on frequency
   */
  isValidSchedule(frequency, schedule) {
    switch (frequency) {
      case 'daily':
        return this.isValidTimeFormat(schedule.time);
      case 'weekly':
        return (
          schedule.dayOfWeek >= 0 &&
          schedule.dayOfWeek <= 6 &&
          this.isValidTimeFormat(schedule.time)
        );
      case 'monthly':
        return (
          schedule.dayOfMonth >= 1 &&
          schedule.dayOfMonth <= 31 &&
          this.isValidTimeFormat(schedule.time)
        );
      default:
        return false;
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  isValidTimeFormat(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Calculate next run time based on frequency and schedule
   */
  calculateNextRunTime(frequency, schedule) {
    const now = new Date();
    let nextRun = new Date();
    const [hours, minutes] = schedule.time.split(':');

    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    switch (frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly':
        while (
          nextRun.getDay() !== schedule.dayOfWeek ||
          nextRun <= now
        ) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'monthly':
        nextRun.setDate(schedule.dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }
}

module.exports = new ExcelController();