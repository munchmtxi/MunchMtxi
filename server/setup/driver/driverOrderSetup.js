'use strict';

const driverOrderRoutes = require('@routes/driver/driverOrderRoutes');
const { logger } = require('@utils/logger');

module.exports = (app) => {
  logger.info('🚚 Setting up driver order routes...');
  app.use('/api/v1/driver/orders', driverOrderRoutes);
};