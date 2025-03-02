const { Notification, NotificationLog } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const CoreNotificationService = require('../core/notificationService');

class MerchantNotificationService extends CoreNotificationService {
  /**
   * Sends a merchant notification.
   * @param {object} notificationData - Data including userId, type, message, and optional orderId.
   * @returns {Promise<Notification>} - The created notification.
   */
  async sendMerchantNotification(notificationData) {
    const { userId, type, message, orderId, templateName, parameters = {} } = notificationData;

    if (!userId || !type || !message) {
      throw new AppError('Missing required merchant notification data', 400, 'INVALID_DATA', null, { userId, type });
    }

    try {
      const newNotification = await Notification.create({
        user_id: userId,
        type,
        message,
        priority: type === 'ORDER_UPDATE' ? 'HIGH' : 'MEDIUM',
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

      logger.info('Merchant notification sent successfully', {
        notificationId: newNotification.id,
        userId,
        type
      });

      return newNotification;
    } catch (error) {
      logger.error('Error sending merchant notification:', {
        error: error.message,
        userId,
        type
      });
      throw new AppError('Failed to send merchant notification', 500, 'NOTIFICATION_ERROR', null, { userId, type });
    }
  }
}

module.exports = MerchantNotificationService;