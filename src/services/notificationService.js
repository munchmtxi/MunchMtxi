// Combined NotificationService for the Black Lotus Clan
const { Notification, User, NotificationLog } = require('@models');
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const eventManager = require('./eventManager');
const whatsappService = require('./whatsappService');

class NotificationService {
  /**
   * @param {Object} io - Socket.io instance for real-time events (optional)
   */
  constructor(io) {
    this.io = io;
  }

  /**
   * Sends a notification using one of two flows:
   * 1. For customers using a 'recipient' object (first approach).
   * 2. For general users via a 'userId' (second approach).
   * If the notification type is 'PAYMENT_UPDATE', a WhatsApp message is also sent.
   *
   * @param {Object} notificationData - The notification data payload.
   * @returns {Promise<Object>} - The created notification record.
   */
  async sendNotification(notificationData) {
    try {
      let newNotification;

      // Flow 1: Using a recipient (e.g., customer notifications)
      if (notificationData.recipient && notificationData.recipient.customer_id) {
        newNotification = await Notification.create({
          type: notificationData.type,
          recipient_id: notificationData.recipient.customer_id,
          recipient_type: 'CUSTOMER',
          data: notificationData.data, // Arbitrary data payload
          status: 'PENDING'
        });

        // Emit event for real-time updates
        eventManager.emit('notification.created', {
          notification: newNotification,
          recipientId: notificationData.recipient.customer_id
        });

      // Flow 2: Using a userId (e.g., app notifications)
      } else if (notificationData.userId) {
        newNotification = await Notification.create({
          user_id: notificationData.userId,
          type: notificationData.type,
          message: notificationData.message,
          priority: notificationData.priority || 'LOW',
          order_id: notificationData.orderId,
          booking_id: notificationData.bookingId
        });

        // Log the notification for auditing
        await NotificationLog.create({
          notification_id: newNotification.id,
          type: notificationData.type,
          status: 'SENT',
          recipient: notificationData.userId
        });

        // Emit via Socket.IO if available
        if (this.io) {
          this.io.to(`user:${notificationData.userId}`).emit(EVENTS.NOTIFICATION.NEW, {
            notification: newNotification
          });

          // Update unread notifications count
          const unreadCount = await this.getUnreadCount(notificationData.userId);
          this.io.to(`user:${notificationData.userId}`).emit(EVENTS.NOTIFICATION.COUNT_UPDATE, {
            count: unreadCount
          });
        }
      } else {
        throw new Error("Notification data must include either a 'recipient' with customer_id or a 'userId'.");
      }

      // If the notification concerns a payment update, send a WhatsApp notification.
      if (notificationData.type === 'PAYMENT_UPDATE') {
        await this.sendPaymentWhatsAppNotification(newNotification);
      }

      return newNotification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Sends a WhatsApp notification for payment updates.
   * Does not throw on error to avoid breaking the overall payment flow.
   *
   * @param {Object} notification - The notification record.
   */
  async sendPaymentWhatsAppNotification(notification) {
    // Use notification.data if available, otherwise fallback to an empty object
    const data = notification.data || {};
    const message = this.generatePaymentMessage(data);

    try {
      await whatsappService.sendMessage({
        recipient_id: notification.recipient_id || notification.user_id,
        template: 'payment_update',
        data: {
          status: data.status,
          amount: data.amount,
          reference: data.payment_id
        }
      });

      // Mark notification as having its WhatsApp message sent
      await notification.update({ whatsapp_sent: true });
    } catch (error) {
      logger.error('WhatsApp notification failed:', error);
      // Intentionally not throwing to prevent disruption in the payment flow.
    }
  }

  /**
   * Generates a message based on payment status.
   *
   * @param {Object} data - Payment data containing status, amount, etc.
   * @returns {string} - The generated payment message.
   */
  generatePaymentMessage(data) {
    const messages = {
      completed: `Payment of ${data.amount} has been successfully processed.`,
      failed: `Payment of ${data.amount} has failed. Please try again.`,
      processing: `Your payment of ${data.amount} is being processed.`
      // Extend with more templates as needed.
    };

    return messages[data.status] || 'Your payment status has been updated.';
  }

  /**
   * Marks one or more notifications as read for a given user.
   *
   * @param {number|string} userId - The ID of the user.
   * @param {Array<number>} notificationIds - Array of notification IDs to mark as read.
   */
  async markAsRead(userId, notificationIds) {
    try {
      await Notification.update(
        { read_status: true },
        {
          where: {
            id: notificationIds,
            user_id: userId
          }
        }
      );

      // Update the unread count and notify the client via Socket.IO
      const unreadCount = await this.getUnreadCount(userId);
      if (this.io) {
        this.io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION.COUNT_UPDATE, {
          count: unreadCount
        });
      }
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Retrieves the count of unread notifications for a user.
   *
   * @param {number|string} userId - The user's ID.
   * @returns {Promise<number>} - The count of unread notifications.
   */
  async getUnreadCount(userId) {
    return await Notification.count({
      where: {
        user_id: userId,
        read_status: false
      }
    });
  }

  /**
   * Retrieves paginated notifications for a user.
   *
   * @param {number|string} userId - The user's ID.
   * @param {Object} options - Pagination options.
   * @param {number} options.page - The current page number.
   * @param {number} options.limit - The number of records per page.
   * @returns {Promise<Object>} - An object containing count and rows.
   */
  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    return await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
  }
}

module.exports = NotificationService;
