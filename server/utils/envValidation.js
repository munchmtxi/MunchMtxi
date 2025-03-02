// server/utils/envValidation.js
const { logger } = require('@utils/logger');

module.exports = {
  validateEnvironment: (requiredEnv) => {
    const missing = requiredEnv.filter(key => !process.env[key]);
    if (missing.length > 0) {
      logger.error('Missing required environment variables:', { missing });
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    logger.info('Environment variables validated successfully');
  }
};