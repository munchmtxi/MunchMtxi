// server/setup/services/notificationServices.js
const NotificationService = require('@services/notifications/core/notificationService');
const EventManager = require('@services/events/core/eventManager');
const { logger } = require('@utils/logger');

module.exports = {
  setupNotificationService: (io, whatsappService, emailService, smsService) => {
    logger.info('Setting up NotificationService...');
    const notificationService = new NotificationService(io, whatsappService, emailService, smsService);
    EventManager.setNotificationService(notificationService);
    logger.info('Notification service initialized with event manager integration', { type: typeof notificationService });
    return notificationService;
  }
};