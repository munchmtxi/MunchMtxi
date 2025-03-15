// server/setup/merchant/profile/merchant2FASetup.js
'use strict';
const merchant2FARoutes = require('@routes/merchant/profile/merchant2FARoutes');
const { logger } = require('@utils/logger');

function setupMerchant2FA(app) {
  logger.info('Setting up Merchant 2FA routes...');
  app.use('/api/merchant/profile/2fa', merchant2FARoutes);
  logger.info('Merchant 2FA routes mounted at /api/merchant/profile/2fa');
}

module.exports = { setupMerchant2FA };