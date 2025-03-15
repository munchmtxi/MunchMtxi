// src/routes/merchant/profile/profileAnalyticsRoutes.js
'use strict';
const express = require('express');
const passport = require('passport');
const profileAnalyticsController = require('@controllers/merchant/profile/profileAnalyticsController');

const router = express.Router({ mergeParams: true });

router.use(passport.authenticate('jwt', { session: false }));

router.get(
  '/summary',
  profileAnalyticsController.verifyMerchantOwnership,
  profileAnalyticsController.getAnalyticsSummary
);

router.get(
  '/active-viewers',
  profileAnalyticsController.verifyMerchantOwnership,
  profileAnalyticsController.getActiveViewers
);

router.get(
  '/detailed',
  profileAnalyticsController.verifyMerchantOwnership,
  profileAnalyticsController.getDetailedAnalytics
);

module.exports = router;