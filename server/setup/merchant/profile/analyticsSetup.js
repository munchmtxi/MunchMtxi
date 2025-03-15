'use strict';
const { logger } = require('@utils/logger');
const profileAnalyticsController = require('@controllers/merchant/profile/profileAnalyticsController');
const passport = require('passport');

const setupAnalyticsRoutes = (app) => {
  logger.info('Setting up analytics routes...');

  // Apply JWT authentication
  app.use('/api/v1/merchants/:merchantId/analytics', passport.authenticate('jwt', { session: false }));

  // Routes with ownership verification
  app.get('/api/v1/merchants/:merchantId/analytics/summary', 
    profileAnalyticsController.verifyMerchantOwnership, 
    profileAnalyticsController.getAnalyticsSummary
  );
  app.get('/api/v1/merchants/:merchantId/analytics/active-viewers', 
    profileAnalyticsController.verifyMerchantOwnership, 
    profileAnalyticsController.getActiveViewers
  );
  app.get('/api/v1/merchants/:merchantId/analytics/detailed', 
    profileAnalyticsController.verifyMerchantOwnership, 
    profileAnalyticsController.getDetailedAnalytics
  );

  logger.info('Analytics routes mounted at /api/v1/merchants/:merchantId/analytics');
};

module.exports = { setupAnalyticsRoutes };