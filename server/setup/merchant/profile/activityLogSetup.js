'use strict';
const activityLogRoutes = require('@routes/merchant/profile/activityLogRoutes');
const { logger } = require('@utils/logger');

module.exports = (app) => {
  app.use('/api/v1/merchants/:merchantId/profile/activity', activityLogRoutes);
  logger.info('Activity log routes mounted');
};