const { Notification, NotificationLog } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const CoreNotificationService = require('../core/notificationService');

class DriverNotificationService extends CoreNotificationService {
  /**
   * Sends a driver notification.
   * @param {object} notificationData - Data including userId, type, message, and optional orderId.
   * @returns {Promise<Notification>} - The created notification.
   */
  async sendDriverNotification(notificationData) {
    const { userId, type, message, orderId, templateName, parameters = {} } = notificationData;

    if (!userId || !type || !message) {
      throw new AppError('Missing required driver notification data', 400, 'INVALID_DATA', null, { userId, type });
    }

    try {
      const newNotification = await Notification.create({
        user_id: userId,
        type,
        message,
        priority: 'HIGH', // Driver notifications are typically high priority
        order_id: orderId,
        read_status: false
      });

      if (['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
        await this.sendThroughChannel(type, {
          notification: { templateName, parameters },
          content: message,
          recipient: parameters.recipient || userId
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

      logger.info('Driver notification sent successfully', {
        notificationId: newNotification.id,
        userId,
        type
      });

      return newNotification;
    } catch (error) {
      logger.error('Error sending driver notification:', {
        error: error.message,
        userId,
        type
      });
      throw new AppError('Failed to send driver notification', 500, 'NOTIFICATION_ERROR', null, { userId, type });
    }
  }
}

module.exports = DriverNotificationService;