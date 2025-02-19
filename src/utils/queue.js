// src/utils/queue.js
const Bull = require('bull');
const logger = require('./logger');
const excelService = require('../services/excelService');
const emailService = require('../services/emailService');
const config = require('../config/config');

// Create queues for different job types
const reportQueue = new Bull('report-generation', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  }
});

// Process report generation jobs
reportQueue.process('generateScheduledReport', async (job) => {
  const { scheduleId, reportType, email, filters, dateRange } = job.data;
  
  try {
    logger.info(`Processing scheduled report generation: ${scheduleId}`);
    
    // Generate the report
    const filePath = await excelService.generateScheduledReport({
      reportType,
      dateRange,
      filters
    });

    // Send email with attachment
    await emailService.sendCustomEmail({
      to: email,
      subject: `Your ${reportType} Report`,
      text: `Please find attached your scheduled ${reportType} report.`,
      attachments: [{
        filename: `${reportType}_report.xlsx`,
        path: filePath
      }]
    });

    // Cleanup
    await excelService.cleanup(filePath);
    
    logger.info(`Successfully processed report: ${scheduleId}`);
    return { success: true, scheduleId };
  } catch (error) {
    logger.error(`Error processing report ${scheduleId}:`, error);
    throw error;
  }
});

// Error handling for the queue
reportQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

reportQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

/**
 * Add a job to the queue
 * @param {string} jobType - Type of job to be processed
 * @param {Object} data - Job data
 * @param {Object} options - Bull job options
 */
const addJobToQueue = async (jobType, data, options = {}) => {
  try {
    let queue;
    switch (jobType) {
      case 'generateScheduledReport':
        queue = reportQueue;
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    // Set up repeatable job if frequency is provided
    if (data.frequency) {
      const repeatOptions = getRepeatOptions(data.frequency, data.schedule);
      options.repeat = repeatOptions;
    }

    // Add job to queue
    const job = await queue.add(jobType, data, options);
    logger.info(`Added ${jobType} job to queue: ${job.id}`);
    
    return job;
  } catch (error) {
    logger.error(`Error adding job to queue:`, error);
    throw error;
  }
};

/**
 * Get repeat options for Bull based on frequency and schedule
 */
const getRepeatOptions = (frequency, schedule) => {
  switch (frequency) {
    case 'daily':
      return {
        cron: `${schedule.time.split(':')[1]} ${schedule.time.split(':')[0]} * * *`
      };
    case 'weekly':
      return {
        cron: `${schedule.time.split(':')[1]} ${schedule.time.split(':')[0]} * * ${schedule.dayOfWeek}`
      };
    case 'monthly':
      return {
        cron: `${schedule.time.split(':')[1]} ${schedule.time.split(':')[0]} ${schedule.dayOfMonth} * *`
      };
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
};

/**
 * Remove a job from the queue
 */
const removeJobFromQueue = async (jobId) => {
  try {
    const job = await reportQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Removed job from queue: ${jobId}`);
    }
  } catch (error) {
    logger.error(`Error removing job from queue:`, error);
    throw error;
  }
};

/**
 * Get queue status
 */
const getQueueStatus = async () => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      reportQueue.getWaitingCount(),
      reportQueue.getActiveCount(),
      reportQueue.getCompletedCount(),
      reportQueue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed
    };
  } catch (error) {
    logger.error('Error getting queue status:', error);
    throw error;
  }
};

module.exports = {
  addJobToQueue,
  removeJobFromQueue,
  getQueueStatus
};