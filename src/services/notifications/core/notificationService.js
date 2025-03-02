// src/services/notifications/core/notificationService.js
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class NotificationService {
  constructor(io, whatsappService, emailService, smsService) {
    this.io = io;
    this.whatsappService = whatsappService; // Use passed instance
    this.emailService = emailService;       // Use passed instance
    this.smsService = smsService;           // Use passed instance
  }

  async sendThroughChannel(type, { notification, content, recipient }) {
    const senders = {
      SMS: () => this.smsService.sendSMS(recipient, content),
      EMAIL: () => this.emailService.sendTemplateEmail(recipient, notification.templateName, notification.parameters),
      WHATSAPP: () => this.whatsappService.sendTemplateMessage(recipient, notification.templateName, notification.parameters)
    };

    const sender = senders[type];
    if (!sender) throw new AppError(`Unsupported notification type: ${type}`, 400, 'UNSUPPORTED_CHANNEL');

    try {
      await sender();
      logger.info(`Notification sent through ${type}`, { recipient, templateName: notification.templateName });
    } catch (error) {
      logger.error(`Failed to send notification through ${type}:`, { error: error.message, recipient });
      throw new AppError(`Failed to send ${type} notification`, 500, 'CHANNEL_ERROR', null, { type, recipient });
    }
  }
}

module.exports = NotificationService;