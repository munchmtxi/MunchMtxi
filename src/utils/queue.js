/**
 * @module utils/queue
 * @description This module sets up a Bull queue for report generation, processes jobs,
 * and provides utility functions for queue management such as adding, removing, listing, pausing,
 * resuming, and cleaning jobs.
 */

const Bull = require('bull');
const logger = require('@utils/logger');
const excelService = require('@services/excelService');
const emailService = require('@services/emailService');
const config = require('@config/config');

// Create a Bull queue for report generation jobs
const reportQueue = new Bull('report-generation', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  }
});

// Process report generation jobs with the specified name 'generateScheduledReport'
reportQueue.process('generateScheduledReport', async (job) => {
  const { scheduleId, reportType, email, filters, dateRange } = job.data;
  
  try {
    logger.info(`Processing scheduled report generation: ${scheduleId}`);
    
    // Generate the report using the excel service
    const filePath = await excelService.generateScheduledReport({
      reportType,
      dateRange,
      filters
    });

    // Send the generated report as an email attachment
    await emailService.sendCustomEmail({
      to: email,
      subject: `Your ${reportType} Report`,
      text: `Please find attached your scheduled ${reportType} report.`,
      attachments: [{
        filename: `${reportType}_report.xlsx`,
        path: filePath
      }]
    });

    // Cleanup the generated report file
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
 * Adds a job to the report generation queue.
 *
 * @async
 * @param {string} jobType - Type of job to be processed.
 * @param {Object} data - Job data.
 * @param {Object} [options={}] - Bull job options.
 * @returns {Promise<Object>} The added job instance.
 * @throws {Error} If the job type is unknown or job addition fails.
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

    // Setup repeatable job options if frequency is provided
    if (data.frequency) {
      const repeatOptions = getRepeatOptions(data.frequency, data.schedule);
      options.repeat = repeatOptions;
    }

    const job = await queue.add(jobType, data, options);
    logger.info(`Added ${jobType} job to queue: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding job to queue:', error);
    throw error;
  }
};

/**
 * Removes a job from the queue based on its job ID.
 *
 * @async
 * @param {string|number} jobId - The ID of the job to remove.
 * @returns {Promise<void>}
 * @throws {Error} If job removal fails.
 */
const removeJobFromQueue = async (jobId) => {
  try {
    const job = await reportQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Removed job from queue: ${jobId}`);
    }
  } catch (error) {
    logger.error('Error removing job from queue:', error);
    throw error;
  }
};

/**
 * Retrieves the current status of the queue.
 *
 * @async
 * @returns {Promise<Object>} An object containing counts of waiting, active, completed, and failed jobs.
 * @throws {Error} If fetching queue status fails.
 */
const getQueueStatus = async () => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      reportQueue.getWaitingCount(),
      reportQueue.getActiveCount(),
      reportQueue.getCompletedCount(),
      reportQueue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  } catch (error) {
    logger.error('Error getting queue status:', error);
    throw error;
  }
};

/**
 * Retrieves a job by its ID.
 *
 * @async
 * @param {string|number} jobId - The job ID to retrieve.
 * @returns {Promise<Object|null>} The job if found, otherwise null.
 * @throws {Error} If retrieving the job fails.
 */
const getJobById = async (jobId) => {
  try {
    return await reportQueue.getJob(jobId);
  } catch (error) {
    logger.error(`Error retrieving job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Lists jobs in the queue filtered by the given statuses.
 *
 * @async
 * @param {string[]} statuses - Array of job statuses to filter (e.g., ['waiting', 'active']).
 * @param {number} [start=0] - Start index for pagination.
 * @param {number} [end=-1] - End index for pagination (-1 to fetch all).
 * @param {boolean} [asc=true] - Whether to sort in ascending order.
 * @returns {Promise<Array>} An array of jobs matching the criteria.
 * @throws {Error} If listing jobs fails.
 */
const listJobs = async (statuses, start = 0, end = -1, asc = true) => {
  try {
    return await reportQueue.getJobs(statuses, start, end, asc);
  } catch (error) {
    logger.error('Error listing jobs:', error);
    throw error;
  }
};

/**
 * Pauses the queue, preventing new jobs from being processed.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If pausing the queue fails.
 */
const pauseQueue = async () => {
  try {
    await reportQueue.pause();
    logger.info('Queue has been paused.');
  } catch (error) {
    logger.error('Error pausing the queue:', error);
    throw error;
  }
};

/**
 * Resumes processing of the queue.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If resuming the queue fails.
 */
const resumeQueue = async () => {
  try {
    await reportQueue.resume();
    logger.info('Queue has been resumed.');
  } catch (error) {
    logger.error('Error resuming the queue:', error);
    throw error;
  }
};

/**
 * Cleans the queue by removing jobs that have been completed or failed
 * and are older than the specified grace time.
 *
 * @async
 * @param {number} graceTime - Time in milliseconds after which jobs should be cleaned.
 * @param {string} [type='completed'] - The type of jobs to clean ('completed' or 'failed').
 * @returns {Promise<Array>} An array of removed jobs.
 * @throws {Error} If cleaning the queue fails.
 */
const cleanQueue = async (graceTime, type = 'completed') => {
  try {
    const removedJobs = await reportQueue.clean(graceTime, type);
    logger.info(`Cleaned ${removedJobs.length} ${type} jobs from the queue.`);
    return removedJobs;
  } catch (error) {
    logger.error('Error cleaning the queue:', error);
    throw error;
  }
};

/**
 * Generates repeat options for Bull jobs based on the provided frequency and schedule.
 *
 * @function getRepeatOptions
 * @param {string} frequency - Frequency of the job ('daily', 'weekly', 'monthly').
 * @param {Object} schedule - Schedule object containing time and additional parameters.
 * @param {string} schedule.time - Time string in the format 'HH:mm'.
 * @param {number} [schedule.dayOfWeek] - Day of the week for weekly jobs (0-6, where 0 is Sunday).
 * @param {number} [schedule.dayOfMonth] - Day of the month for monthly jobs (1-31).
 * @returns {Object} An object with a cron expression for job repetition.
 * @throws {Error} If the frequency is invalid.
 */
const getRepeatOptions = (frequency, schedule) => {
  const [hour, minute] = schedule.time.split(':');
  switch (frequency) {
    case 'daily':
      return {
        cron: `${minute} ${hour} * * *`
      };
    case 'weekly':
      return {
        cron: `${minute} ${hour} * * ${schedule.dayOfWeek}`
      };
    case 'monthly':
      return {
        cron: `${minute} ${hour} ${schedule.dayOfMonth} * *`
      };
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
};

module.exports = {
  addJobToQueue,
  removeJobFromQueue,
  getQueueStatus,
  getJobById,
  listJobs,
  pauseQueue,
  resumeQueue,
  cleanQueue
};
