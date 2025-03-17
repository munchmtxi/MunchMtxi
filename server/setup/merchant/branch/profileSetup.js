// src/setup/merchant/branch/profileSetup.js
'use strict';
const branchProfileRoutes = require('@routes/merchant/branch/profileRoutes');
const { logger } = require('@utils/logger');

const setupBranchProfile = (app) => {
  try {
    app.use('/api/v1/merchants/branches', branchProfileRoutes);
    logger.info('Branch profile routes mounted successfully at /api/v1/merchants/branches');
  } catch (error) {
    logger.error('Error setting up branch profile routes', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = { setupBranchProfile };