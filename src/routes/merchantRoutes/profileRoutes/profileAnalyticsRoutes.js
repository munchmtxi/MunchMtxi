// src/routes/merchantRoutes/profileRoutes/profileAnalyticsRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });

// Import required modules
const { 
  recordProfileView,
  getDetailedAnalytics,
  updateViewAnalytics,
  getActiveViewers,
  getAnalyticsSummary,
  getViewerDemographics,
  getInteractionMetrics 
} = require('@controllers/merchantControllers/profileControllers/profileAnalyticsController');
const { 
  validateRecordView, 
  validateDetailedAnalytics, 
  validateUpdateView, 
  validateActiveViewers, 
  validateAnalyticsSummary, 
  validateDemographics, 
  validateInteractionMetrics 
} = require('@validators/merchantValidators/profileValidators/profileAnalyticsValidator');
const { protect, hasMerchantPermission } = require('@middleware/authMiddleware');
const merchantMetricsMiddleware = require('@middleware/merchantMetricsMiddleware');

// Apply middleware to all routes
router.use(protect);
router.use(merchantMetricsMiddleware.handle);

// Basic analytics endpoints
router.route('/views')
  .post(validateRecordView, recordProfileView)
  .get(
    hasMerchantPermission('VIEW_ANALYTICS'), 
    validateDetailedAnalytics, 
    getDetailedAnalytics
  );

// View session management
router.route('/views/:sessionId')
  .patch(validateUpdateView, updateViewAnalytics);

// Active viewers tracking
router.route('/active')
  .get(
    hasMerchantPermission('VIEW_ANALYTICS'), 
    validateActiveViewers, 
    getActiveViewers
  );

// Analytics reporting
router.route('/summary')
  .get(
    hasMerchantPermission('VIEW_ANALYTICS'), 
    validateAnalyticsSummary, 
    getAnalyticsSummary
  );

// Demographics and metrics
router.route('/insights')
  .get(
    hasMerchantPermission('VIEW_ANALYTICS'), 
    validateDemographics, 
    getViewerDemographics
  );

// Performance metrics
router.route('/performance')
  .get(
    hasMerchantPermission('VIEW_ANALYTICS'), 
    validateInteractionMetrics, 
    getInteractionMetrics
  );

// Mount in your main merchant routes file:
// merchantRoutes.use('/:merchantId/profile/analytics', profileAnalyticsRoutes);

module.exports = router;