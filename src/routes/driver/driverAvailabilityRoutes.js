'use strict';

const express = require('express');
const router = express.Router();
const driverAvailabilityController = require('@controllers/driver/driverAvailabilityController');
const driverAvailabilityMiddleware = require('@middleware/driver/driverAvailabilityMiddleware');
const { logger } = require('@utils/logger');

router.use((req, res, next) => {
  logger.info('Entering driver availability route', { method: req.method, path: req.path, driverId: req.driver?.id });
  next();
});

router
  .route('/:driverId/shift')
  .post(
    driverAvailabilityMiddleware.protect,
    driverAvailabilityMiddleware.restrictTo,
    driverAvailabilityMiddleware.validateDriverId,
    driverAvailabilityMiddleware.validateShiftData,
    driverAvailabilityController.setShift
  );

router
  .route('/:driverId/availability')
  .get(
    driverAvailabilityMiddleware.protect,
    driverAvailabilityMiddleware.restrictTo,
    driverAvailabilityMiddleware.validateDriverId,
    driverAvailabilityController.getAvailability
  );

router
  .route('/:driverId/status')
  .patch(
    driverAvailabilityMiddleware.protect,
    driverAvailabilityMiddleware.restrictTo,
    driverAvailabilityMiddleware.validateDriverId,
    driverAvailabilityMiddleware.validateOnlineStatus,
    driverAvailabilityController.toggleStatus
  );

router
  .route('/:driverId/simulate')
  .post(
    driverAvailabilityMiddleware.protect,
    driverAvailabilityMiddleware.restrictToDriverOrAdmin,
    driverAvailabilityMiddleware.validateDriverId,
    driverAvailabilityController.simulateAvailability
  );

router
  .route('/:driverId/device')
  .get(
    driverAvailabilityMiddleware.protect,
    driverAvailabilityMiddleware.restrictTo,
    driverAvailabilityMiddleware.validateDriverId,
    driverAvailabilityController.getDeviceStatus
  );

module.exports = router;