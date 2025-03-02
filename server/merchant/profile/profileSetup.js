// server/setup/merchant/profile/profileSetup.js
const profileRoutes = require('@routes/merchant/profile/profileRoutes');
const { logger } = require('@utils/logger');

module.exports = {
  setupMerchantProfile: (app) => {
    logger.info('Setting up merchant profile routes...');
    app.use('/api/merchant/profile', profileRoutes);
    logger.info('Merchant profile routes setup complete');
  }
};