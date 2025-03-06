const WhatsAppService = require('@services/common/whatsappService');
const EmailService = require('@services/common/emailService');
const SMSService = require('@services/common/smsService');
const { setupGeolocationServices } = require('../services/geolocationServices'); // Relative path from server/setup/services/
const { logger } = require('@utils/logger');

module.exports = {
  setupCommonServices: () => {
    logger.info('File loaded: commonServices.js'); // Debug to confirm loading
    logger.info('Initializing WhatsAppService...');
    const whatsappService = WhatsAppService; // Instance, no 'new' needed
    logger.info('WhatsAppService initialized', { type: typeof whatsappService });

    logger.info('Initializing EmailService...');
    const emailService = EmailService; // Instance, no 'new' needed
    logger.info('EmailService initialized', { type: typeof emailService });

    logger.info('Initializing SMSService...');
    const smsService = new SMSService(); // Class, requires instantiation
    logger.info('SMSService initialized', { type: typeof smsService });

    logger.info('Setting up geolocation services...');
    const geolocationServices = setupGeolocationServices();
    logger.info('Geolocation services setup complete', { services: Object.keys(geolocationServices) });

    logger.info('Common services initialized');
    return { whatsappService, emailService, smsService, ...geolocationServices };
  }
};