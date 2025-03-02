const { Notification, NotificationLog } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const CoreNotificationService = require('../core/notificationService');

class StaffNotificationService extends CoreNotificationService {
  /**
   * Sends a staff notification.
   * @param {object} notificationData - Data including userId, type, message, and optional bookingId.
   * @returns {Promise<Notification>} - The created notification.
   */
  async sendStaffNotification(notificationData) {
    const { userId, type, message, bookingId, templateName, parameters = {} } = notificationData;

    if (!userId || !type || !message) {
      throw new AppError('Missing required staff notification data', 400, 'INVALID_DATA', null, { userId, type });
    }

    try {
      const newNotification = await Notification.create({
        user_id: userId,
        type,
        message,
        priority: type === 'TABLE_REQUEST' ? 'HIGH' : 'MEDIUM',
        booking_id: bookingId,
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

      logger.info('Staff notification sent successfully', {
        notificationId: newNotification.id,
        userId,
        type
      });

      return newNotification;
    } catch (error) {
      logger.error('Error sending staff notification:', {
        error: error.message,
        userId,
        type
      });
      throw new AppError('Failed to send staff notification', 500, 'NOTIFICATION_ERROR', null, { userId, type });
    }
  }
}

module.exports = StaffNotificationService;