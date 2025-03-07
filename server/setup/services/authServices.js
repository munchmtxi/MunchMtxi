// server/setup/services/authServices.js
const { logger } = require('@utils/logger');

logger.info('File loaded: authServices.js');

module.exports = {
  setupAuthServices: () => {
    logger.info('Setting up auth services...');
    // Import the existing auth service logic
    const authService = require('@services/common/authService');
    logger.info('Auth service imported from @services/common/authService', {
      functions: Object.keys(authService)
    });
    return authService; // Return for use in controllers
  }
};