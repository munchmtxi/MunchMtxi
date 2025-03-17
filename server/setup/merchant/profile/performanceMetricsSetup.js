'use strict';

const performanceMetricsRoutes = require('@routes/merchant/profile/performanceMetricsRoutes');
const { logger } = require('@utils/logger');

const setupPerformanceMetrics = (app) => {
  logger.info('Setting up merchant performance metrics routes');

  // Mount the performance metrics routes under /api/merchant/profile
  app.use('/api/merchant/profile', performanceMetricsRoutes);

  logger.info('Merchant performance metrics routes mounted successfully');
};

module.exports = setupPerformanceMetrics;