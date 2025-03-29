'use strict';

const menuRoutes = require('@routes/customer/menuRoutes');
const { logger } = require('@utils/logger');

/**
 * Sets up menu-related routes for customers
 * @param {Express} app - Express app instance
 */
const setupMenuRoutes = (app) => {
  app.use('/api/merchant', menuRoutes);
  logger.info('🍔 Menu routes mounted at /api/merchant');
};

module.exports = setupMenuRoutes;