'use strict';

const express = require('express');
const DriverOrderController = require('@controllers/driver/driverOrderController');
const DriverOrderMiddleware = require('@middleware/driver/driverOrderMiddleware');

const router = express.Router();

// 1. Assign an order to a driver
router.post(
  '/assign/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.ensureDriverAvailability,
  DriverOrderController.assignOrder
);

// 2. Confirm pickup by the driver
router.put(
  '/pickup/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderMiddleware.validatePickupToken,
  DriverOrderController.confirmPickup
);

// 3. Track delivery progress
router.put(
  '/track/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderMiddleware.validateTrackingData,
  DriverOrderController.trackDelivery
);

// 4. Complete the order delivery
router.put(
  '/complete/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderController.completeOrder
);

module.exports = router;