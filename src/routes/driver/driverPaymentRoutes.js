'use strict';

const express = require('express');
const DriverPaymentController = require('@controllers/driver/DriverPaymentController');
const DriverPaymentMiddleware = require('@middleware/driver/DriverPaymentMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

// Middleware logging for all driver payment routes
router.use((req, res, next) => {
  logger.info('Entering driver payment route', { method: req.method, path: req.path, driverId: req.driver?.id });
  next();
});

// Add a tip to a payment
router.post(
  '/payments/:paymentId/tip',
  DriverPaymentMiddleware.protect,
  DriverPaymentMiddleware.restrictToDriver,
  DriverPaymentMiddleware.restrictToPaymentOwner,
  DriverPaymentMiddleware.validateTipRequest,
  DriverPaymentMiddleware.rateLimitPayment,
  DriverPaymentController.addTip
);

// Get driver earnings
router.get(
  '/earnings',
  DriverPaymentMiddleware.protect,
  DriverPaymentMiddleware.restrictToDriver,
  DriverPaymentController.getEarnings
);

// Request a payout
router.post(
  '/payout',
  DriverPaymentMiddleware.protect,
  DriverPaymentMiddleware.restrictToDriver,
  DriverPaymentMiddleware.validatePayoutRequest,
  DriverPaymentMiddleware.rateLimitPayment,
  DriverPaymentController.requestPayout
);

module.exports = router;