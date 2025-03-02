const { Notification, NotificationLog } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const CoreNotificationService = require('../core/notificationService');

class CustomerNotificationService extends CoreNotificationService {
  /**
   * Sends a customer notification.
   * @param {object} notificationData - Data including recipient, type, data, and optional orderId/bookingId.
   * @returns {Promise<Notification>} - The created notification.
   */
  async sendCustomerNotification(notificationData) {
    const { recipient, type, data, orderId, bookingId } = notificationData;

    if (!recipient?.customer_id || !type || !data?.message) {
      throw new AppError('Missing required customer notification data', 400, 'INVALID_DATA', null, { recipient, type });
    }

    try {
      const newNotification = await Notification.create({
        user_id: recipient.customer_id,
        type,
        message: data.message,
        priority: type === 'ORDER_UPDATE' ? 'HIGH' : 'MEDIUM',
        order_id: orderId,
        booking_id: bookingId,
        read_status: false
      });

      if (['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
        await this.sendThroughChannel(type, {
          notification: { templateName: data.templateName, parameters: data.parameters || {} },
          content: data.message,
          recipient: recipient.phone || recipient.email || recipient.customer_id
        });
      }

      await NotificationLog.create({
        notification_id: newNotification.id,
        type,
        recipient: recipient.customer_id,
        template_name: data.templateName,
        parameters: data.parameters,
        content: data.message,
        status: 'SENT',
        retry_count: 0
      });

      logger.info('Customer notification sent successfully', {
        notificationId: newNotification.id,
        customerId: recipient.customer_id,
        type
      });

      return newNotification;
    } catch (error) {
      logger.error('Error sending customer notification:', {
        error: error.message,
        customerId: recipient?.customer_id,
        type
      });
      throw new AppError('Failed to send customer notification', 500, 'NOTIFICATION_ERROR', null, { recipient, type });
    }
  }
}

module.exports = CustomerNotificationService;