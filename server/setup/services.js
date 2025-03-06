const SMSService = require('@services/smsService');
const NotificationService = require('@services/notificationService');
const EventManager = require('@services/eventManager');
const { setupSocket } = require('./socket');
const { setupGeolocationServices } = require('./services/geolocationServices');
const { logger } = require('@utils/logger');

logger.info('File loaded: services.js');

module.exports = {
  setupServices: (server) => {
    logger.info('Starting setupServices execution...'); // Extra debug
    logger.info('Setting up services...');
    logger.info('Setting up Socket.IO for services...');
    const io = setupSocket(server);
    logger.info('Socket.IO setup complete for services');
    logger.info('Initializing SMSService...');
    const smsService = new SMSService();
    logger.info('SMSService initialized', { type: typeof smsService });
    logger.info('Setting up NotificationService...');
    const notificationService = new NotificationService(io, smsService);
    EventManager.setNotificationService(notificationService);
    logger.info('Notification service initialized with event manager integration', { type: typeof notificationService });
    logger.info('Setting up geolocation services...');
    const geolocationServices = setupGeolocationServices();
    logger.info('Geolocation services setup complete', { services: Object.keys(geolocationServices) });
    const services = { io, notificationService, ...geolocationServices };
    logger.info('All services setup complete', {
      whatsappType: 'object',
      emailType: 'object',
      smsType: typeof smsService,
      geolocationServices: Object.keys(geolocationServices)
    });
    return services;
  }
};