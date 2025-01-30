require('dotenv').config();
const path = require('path');
const config = require('../config/config');
const logger = require('../src/utils/logger');

function validateEnvironment() {
  const requiredConfigSections = {
    database: ['host', 'username', 'password', 'database', 'port'],
    jwt: ['secret', 'algorithm', 'defaultExpiration', 'refreshSecret', 'refreshExpiresIn'],
    redis: ['host', 'port'],
    googleMaps: ['apiKey'],
    googleOAuth: ['clientId', 'clientSecret', 'redirectUri'],
    whatsapp: ['twilioAccountSid', 'twilioAuthToken', 'twilioWhatsappNumber'],
    emailService: ['host', 'port', 'username', 'password', 'encryption']
  };

  const errors = [];

  // Validate each configuration section
  Object.entries(requiredConfigSections).forEach(([section, requiredFields]) => {
    const sectionConfig = config[section] || config.database[section];
    requiredFields.forEach(field => {
      if (!sectionConfig || !sectionConfig[field]) {
        errors.push(`Missing configuration: ${section}.${field}`);
      }
    });
  });

  // Additional environment-specific validations
  if (config.nodeEnv === 'test' && !process.env.DB_NAME_TEST) {
    errors.push('Missing DB_NAME_TEST for test environment');
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(error => logger.error(`- ${error}`));
    process.exit(1);
  }

  logger.info('Environment validation successful');
}

validateEnvironment();