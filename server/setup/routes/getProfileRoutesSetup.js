// server/setup/routes/getProfileRoutesSetup.js
'use strict';

const { setupGetProfile } = require('../merchant/profile/getProfileSetup'); // Relative path
const { logger } = require('@utils/logger');

logger.info('File loaded: getProfileRoutesSetup.js');

module.exports = {
  setupGetProfileRoutes: (app) => {
    logger.info('Setting up get profile routes...');
    setupGetProfile(app);
    logger.info('Get profile routes setup complete');
  },
};