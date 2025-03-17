'use strict';

const router = require('express').Router();
const performanceMetricsController = require('@controllers/merchant/profile/performanceMetricsController');
const merchantMetricsMiddleware = require('@middleware/merchantMetricsMiddleware');
const { logger } = require('@utils/logger');

router.use((req, res, next) => {
  logger.info('Merchant performance metrics route accessed', {
    method: req.method,
    path: req.path,
  });
  next();
});

/**
 * @route GET /api/merchant/profile/performance-metrics
 * @desc Get performance metrics for the authenticated merchant
 * @access Private (Merchant only)
 */
router.get(
  '/performance-metrics',
  merchantMetricsMiddleware.authenticateMerchant,
  merchantMetricsMiddleware.validateMetricsParams,
  performanceMetricsController.getPerformanceMetrics
);

/**
 * @route POST /api/merchant/profile/performance-metrics/update-order
 * @desc Update metrics for a specific order
 * @access Private (Merchant only)
 */
router.post(
  '/performance-metrics/update-order',
  merchantMetricsMiddleware.authenticateMerchant,
  merchantMetricsMiddleware.validateOrderUpdate,
  performanceMetricsController.updateMetricsForOrder
);

/**
 * @route POST /api/merchant/profile/performance-metrics/recalculate
 * @desc Force recalculate and store metrics for a period
 * @access Private (Merchant only)
 */
router.post(
  '/performance-metrics/recalculate',
  merchantMetricsMiddleware.authenticateMerchant,
  performanceMetricsController.recalculateMetrics
);

module.exports = router;