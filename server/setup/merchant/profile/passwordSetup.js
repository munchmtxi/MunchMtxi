'use strict';
const { logger } = require('@utils/logger');
const passwordRoutes = require('@routes/merchant/profile/passwordRoutes');

module.exports = {
  setupMerchantPassword: (app) => {
    logger.info('Setting up merchant password routes...');
    app.use('/api/merchant/profile/password', passwordRoutes);
    logger.info('Merchant password routes mounted at /api/merchant/profile/password');
  },
};