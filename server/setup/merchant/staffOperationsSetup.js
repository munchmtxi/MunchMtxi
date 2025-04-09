'use strict';

const staffOperationsRoutes = require('@routes/merchant/staffOperationsRoutes');
const { logger } = require('@utils/logger');

module.exports = (app, io) => {
  app.use('/api/v1/merchants/:merchantId/staff', staffOperationsRoutes(io));
  logger.info('Merchant staff operations routes mounted');
};