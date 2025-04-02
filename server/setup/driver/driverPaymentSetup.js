'use strict';

const driverPaymentRoutes = require('@routes/driver/driverPaymentRoutes');
const { logger } = require('@utils/logger');

/**
 * Sets up driver payment-related functionality for the MunchMtxi server.
 * @param {Object} app - Express application instance.
 */
const setupDriverPayment = (app) => {
  logger.info('Setting up driver payment module');

  // Register driver payment routes under /api/v1/driver
  app.use('/api/v1/driver', driverPaymentRoutes);

  logger.info('Driver payment routes registered successfully at /api/v1/driver');
};

module.exports = setupDriverPayment;