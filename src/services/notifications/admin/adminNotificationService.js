const { Notification, NotificationLog } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const CoreNotificationService = require('../core/notificationService');

class AdminNotificationService extends CoreNotificationService {
  /**
   * Sends an admin notification (e.g., system alert).
   * @param {object} notificationData - Data including userId, type, message, and optional parameters.
   * @returns {Promise<Notification>} - The created notification.
   */
  async sendAdminNotification(notificationData) {
    const { userId, type, message, templateName, parameters = {} } = notificationData;

    if (!userId || !type || !message) {
      throw new AppError('Missing required notification data', 400, 'INVALID_DATA', null, { userId, type });
    }

    try {
      const newNotification = await Notification.create({
        user_id: userId,
        type,
        message,
        priority: 'CRITICAL', // Admin notifications are typically critical
        read_status: false
      });

      // Send through the appropriate channel if specified
      if (['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
        await this.sendThroughChannel(type, {
          notification: { templateName, parameters },
          content: message,
          recipient: parameters.recipient || userId // Fallback to userId if no recipient specified
        });
      }

      await NotificationLog.create({
        notification_id: newNotification.id,
        type,
        recipient: parameters.recipient || userId,
        template_name: templateName,
        parameters,
        content: message,
        status: 'SENT',
        retry_count: 0
      });

      logger.info('Admin notification sent successfully', {
        notificationId: newNotification.id,
        userId,
        type
      });

      return newNotification;
    } catch (error) {
      logger.error('Error sending admin notification:', {
        error: error.message,
        userId,
        type
      });
      throw new AppError('Failed to send admin notification', 500, 'NOTIFICATION_ERROR', null, { userId, type });
    }
  }
}

module.exports = AdminNotificationService;