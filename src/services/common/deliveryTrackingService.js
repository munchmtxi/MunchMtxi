const { NotificationLog, Notification, sequelize } = require('@models');
const { Op } = require('sequelize');
const { logger, logTransactionEvent } = require('@utils/logger');
const eventManager = require('./eventManager');
const whatsappService = require('./whatsappService');
const smsService = require('./smsService');
const emailService = require('./emailService');

class DeliveryTrackingService {
  constructor() {
    this.retryLimits = {
      CRITICAL: { maxAttempts: 5, backoffMinutes: 2 },
      HIGH: { maxAttempts: 4, backoffMinutes: 5 },
      MEDIUM: { maxAttempts: 3, backoffMinutes: 10 },
      LOW: { maxAttempts: 2, backoffMinutes: 15 }
    };

    this.services = {
      WHATSAPP: whatsappService,
      EMAIL: emailService,
      SMS: smsService
    };

    logger.info({
      message: 'Delivery tracking service initialized',
      type: 'system'
    });
  }

  /**
   * Process failed notifications for retry
   */
  async processFailedNotifications() {
    try {
      const failedLogs = await NotificationLog.findAll({
        where: {
          status: 'FAILED',
          retry_count: {
            [Op.lt]: sequelize.literal(`CASE 
              WHEN priority = 'CRITICAL' THEN 5
              WHEN priority = 'HIGH' THEN 4
              WHEN priority = 'MEDIUM' THEN 3
              ELSE 2
            END`)
          },
          next_retry_at: {
            [Op.lte]: new Date()
          }
        },
        include: [{
          model: Notification,
          as: 'notification',
          required: true
        }]
      });

      logTransactionEvent('Processing failed notifications', {
        count: failedLogs.length,
        service: 'delivery-tracking'
      });

      for (const log of failedLogs) {
        await this.retryNotification(log);
      }
    } catch (error) {
      logger.error({
        message: 'Error processing failed notifications',
        error: error.message,
        stack: error.stack,
        type: 'system'
      });
    }
  }

  /**
   * Retry a failed notification
   */
  async retryNotification(log) {
    try {
      const notification = log.notification;
      const retryConfig = this.retryLimits[notification.priority];
      
      if (log.retry_count >= retryConfig.maxAttempts) {
        await this.markAsPermanentlyFailed(log);
        return;
      }

      const service = this.services[log.type];
      if (!service) {
        throw new Error(`Unknown notification type: ${log.type}`);
      }

      // Use snake case for template name
      if (log.template_name) {
        await service.sendTemplateMessage(
          log.recipient,
          log.template_name,
          log.parameters
        );
      } else {
        await service.sendCustomMessage(
          log.recipient,
          log.content
        );
      }

      // Update retry count and next retry time
      await log.update({
        retry_count: log.retry_count + 1,
        next_retry_at: this.calculateNextRetryTime(
          log.retry_count + 1,
          notification.priority
        ),
        status: 'SENT'
      });

      logTransactionEvent('Notification retry successful', {
        notificationId: log.id,
        type: log.type,
        retryCount: log.retry_count,
        recipient: log.recipient
      });

      eventManager.emit('notification.retry.success', { log });
    } catch (error) {
      logger.error({
        message: `Retry failed for notification ${log.id}`,
        error: error.message,
        stack: error.stack,
        type: 'system',
        metadata: {
          notificationId: log.id,
          type: log.type,
          retryCount: log.retry_count,
          recipient: log.recipient
        }
      });
      
      await log.update({
        retry_count: log.retry_count + 1,
        next_retry_at: this.calculateNextRetryTime(
          log.retry_count + 1,
          log.notification.priority
        ),
        error: error.message
      });

      eventManager.emit('notification.retry.failed', { log, error });
    }
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  calculateNextRetryTime(attemptCount, priority) {
    const { backoffMinutes } = this.retryLimits[priority];
    const backoffTime = backoffMinutes * Math.pow(2, attemptCount - 1);
    return new Date(Date.now() + backoffTime * 60 * 1000);
  }

  /**
   * Mark a notification as permanently failed
   */
  async markAsPermanentlyFailed(log) {
    await log.update({
      status: 'PERMANENTLY_FAILED',
      error: `Max retry attempts (${log.retry_count}) reached`
    });

    logTransactionEvent('Notification marked as permanently failed', {
      notificationId: log.id,
      type: log.type,
      retryCount: log.retry_count,
      recipient: log.recipient
    });

    eventManager.emit('notification.permanently_failed', { log });
  }

  /**
   * Get delivery analytics for a time period
   */
  async getDeliveryAnalytics(startDate, endDate) {
    try {
      const analytics = await NotificationLog.findAll({
        where: {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'type',
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('retry_count')), 'avg_retries']
        ],
        group: ['type', 'status']
      });

      const permanentlyFailedByReason = await NotificationLog.findAll({
        where: {
          status: 'PERMANENTLY_FAILED',
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'error',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['error']
      });

      return {
        deliveryStats: analytics,
        failureAnalysis: permanentlyFailedByReason
      };
    } catch (error) {
      logger.error({
        message: 'Error generating delivery analytics',
        error: error.message,
        stack: error.stack,
        type: 'system',
        metadata: { startDate, endDate }
      });
      throw error;
    }
  }
}

module.exports = new DeliveryTrackingService();
