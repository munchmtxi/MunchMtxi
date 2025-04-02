'use strict';

const express = require('express');
const DriverController = require('@controllers/driver/driverController');
const DriverMiddleware = require('@middleware/driver/driverMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

// Middleware logging for all driver routes
router.use((req, res, next) => {
  logger.info('Entering driver route', { method: req.method, path: req.path, driverId: req.driver?.id });
  next();
});

// Match a driver to a ride (system-initiated, e.g., admin or automated)
router.post(
  '/rides/:rideId/match',
  DriverMiddleware.protect,
  DriverMiddleware.restrictToDriver,
  DriverController.matchDriverToRide
);

// Accept a ride assignment
router.patch(
  '/rides/:rideId/accept',
  DriverMiddleware.protect,
  DriverMiddleware.restrictToDriver,
  DriverMiddleware.restrictToRideOwner,
  DriverMiddleware.validateRideAcceptance,
  DriverMiddleware.ensureDriverAvailable,
  DriverController.acceptRide
);

// Complete a ride
router.patch(
  '/rides/:rideId/complete',
  DriverMiddleware.protect,
  DriverMiddleware.restrictToDriver,
  DriverMiddleware.restrictToRideOwner,
  DriverMiddleware.validateRideCompletion,
  DriverController.completeRide
);

// Update driver location
router.patch(
  '/location',
  DriverMiddleware.protect,
  DriverMiddleware.restrictToDriver,
  DriverMiddleware.validateLocationUpdate,
  DriverMiddleware.rateLimitDriver,
  DriverController.updateLocation
);

// Get active ride
router.get(
  '/rides/active',
  DriverMiddleware.protect,
  DriverMiddleware.restrictToDriver,
  DriverController.getActiveRide
);

module.exports = router;