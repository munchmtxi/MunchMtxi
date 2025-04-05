'use strict';

const express = require('express');
const router = express.Router();
const performanceIncentiveController = require('@controllers/staff/performanceIncentiveController');
const performanceIncentiveMiddleware = require('@middleware/staff/performanceIncentiveMiddleware');

// Removed router.use(verifyToken) to apply it per route

router.get(
  '/:staffId/metrics',
  performanceIncentiveMiddleware.verifyToken,
  performanceIncentiveController.getPerformanceMetrics
);

router.post(
  '/:staffId/calculate',
  performanceIncentiveMiddleware.verifyToken,
  performanceIncentiveController.calculateRewards
);

router.post(
  '/:staffId/assign-tier',
  performanceIncentiveMiddleware.verifyToken,
  performanceIncentiveController.assignTier
);

router.post(
  '/:staffId/redeem',
  performanceIncentiveMiddleware.verifyToken,
  performanceIncentiveMiddleware.validateRedeemBody,
  performanceIncentiveController.redeemRewards
);

module.exports = router;