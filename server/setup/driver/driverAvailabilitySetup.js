'use strict';

const driverAvailabilityRoutes = require('@routes/driver/driverAvailabilityRoutes');
const { logger } = require('@utils/logger');

const setupDriverAvailability = (app) => {
  logger.info('Setting up driver availability module');
  app.use('/api/v1/driver', driverAvailabilityRoutes);
  logger.info('Driver availability routes registered successfully at /api/v1/driver');
};

module.exports = setupDriverAvailability;