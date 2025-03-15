'use strict';
const { logger } = require('@utils/logger');
const { getMerchantProfile } = require('@controllers/merchant/profile/getProfileController');
const { trackAnalytics } = require('@middleware/analyticsMiddleware');
const passport = require('passport');

const setupPublicProfile = (app) => {
  app.get(
    '/api/v1/merchants/:merchantId/profile',
    // Ensure JWT is processed first
    (req, res, next) => {
      passport.authenticate('jwt', { session: false, failWithError: false }, (err, user) => {
        if (err) return next(err);
        req.user = user || null; // Set req.user even if unauthenticated
        next();
      })(req, res, next);
    },
    trackAnalytics(),
    (req, res, next) => {
      logger.info('Direct route hit', { merchantId: req.params.merchantId, userId: req.user?.id });
      getMerchantProfile(req, res, next);
    }
  );
  logger.info('Public profile route mounted at /api/v1/merchants/:merchantId/profile with analytics tracking');
};

module.exports = { setupPublicProfile };