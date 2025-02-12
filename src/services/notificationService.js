const { Notification, User, NotificationLog, Template } = require('@models');
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const eventManager = require('./eventManager');
const whatsappService = require('./whatsappService');
const smsService = require('./smsService');
const emailService = require('./emailService');
const TemplateProcessor = require('../utils/templateProcessor');
const AppError = require('../utils/appError');

class NotificationService {
  /**
   * @param {Object} io - Socket.io instance for real-time events (optional)
   * @param {Object} smsService - SMS service instance for sending SMS notifications
   */
  constructor(io, smsService) {
    this.io = io;
    this.smsService = smsService;
    this.whatsappService = whatsappService;
    this.emailService = emailService;
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

      // If SMS notification type or channel is specified, send an SMS notification.
      if (notificationData.type === 'SMS' || notificationData.channels?.includes('SMS')) {
        await this.sendSMSNotification(newNotification);
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
    };

    return messages[data.status] || 'Your payment status has been updated.';
  }

  /**
   * Sends an SMS notification.
   *
   * @param {Object} notification - The notification record.
   */
  async sendSMSNotification(notification) {
    const data = notification.data || {};
    const message = this.generateSMSMessage(data);

    try {
      await this.smsService.sendSMS(
        notification.recipient_id || notification.user_id,
        message,
        data.templateName
      );

      await notification.update({ sms_sent: true });
    } catch (error) {
      logger.error('SMS notification failed:', error);
      // Don't throw to prevent disrupting the main flow
    }
  }

  /**
   * Generates an SMS message based on the provided data.
   * (Placeholder implementation - extend as needed.)
   *
   * @param {Object} data - Data for the SMS message.
   * @returns {string} - The generated SMS message.
   */
  generateSMSMessage(data) {
    // Customize this method for the Black Lotus Clan's requirements
    return data.message || 'You have a new notification.';
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

  /**
   * Sends a templated notification by processing the template with provided variables,
   * creating a notification record, logging it, and dispatching it through the appropriate channel.
   *
   * @param {string} templateName - The name of the template.
   * @param {number|string} recipientId - The ID of the recipient.
   * @param {Object} variables - Variables to replace in the template.
   * @param {Object} options - Additional options such as merchantId, priority, orderId, bookingId.
   * @returns {Promise<Object>} - The created notification record.
   */
  async sendTemplatedNotification(templateName, recipientId, variables, options = {}) {
    try {
      // Fetch template
      const template = await Template.findOne({
        where: {
          name: templateName,
          status: 'ACTIVE',
          merchant_id: options.merchantId || null
        }
      });

      if (!template) {
        throw new AppError(`Template not found: ${templateName}`, 404);
      }

      // Process template with variables
      const processedContent = TemplateProcessor.process(template, variables);

      // Create notification record
      const notification = await Notification.create({
        user_id: recipientId,
        type: template.type,
        template_id: template.id,
        message: processedContent,
        priority: options.priority || 'LOW',
        order_id: options.orderId,
        booking_id: options.bookingId
      });

      // Log the notification
      await NotificationLog.create({
        notification_id: notification.id,
        type: template.type,
        recipient: recipientId,
        template_id: template.id,
        templateName: template.name,
        parameters: variables,
        content: processedContent,
        status: 'SENT'
      });

      // Send through appropriate channel
      await this.sendThroughChannel(template.type, {
        notification,
        content: processedContent,
        recipient: recipientId
      });

      return notification;
    } catch (error) {
      logger.error('Error sending templated notification:', error);
      throw error;
    }
  }

  /**
   * Dispatches the notification through the appropriate channel based on its type.
   *
   * @param {string} type - The type of the notification (e.g., SMS, EMAIL, WHATSAPP).
   * @param {Object} param0 - Object containing notification, content, and recipient.
   */
  async sendThroughChannel(type, { notification, content, recipient }) {
    const senders = {
      SMS: () => this.smsService.sendSMS(recipient, content),
      EMAIL: () => this.emailService.sendEmail(recipient, content),
      WHATSAPP: () => this.whatsappService.sendMessage(recipient, content)
    };

    const sender = senders[type];
    if (!sender) {
      throw new AppError(`Unsupported notification type: ${type}`, 400);
    }

    await sender();
  }
}

module.exports = NotificationService;
