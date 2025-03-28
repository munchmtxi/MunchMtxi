'use strict';
const express = require('express');
const RideController = require('@controllers/customer/rideController');
const RideMiddleware = require('@middleware/rideMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

// Ride request routes
router.post(
  '/request', // Adjusted to /api/v1/rides/request
  (req, res, next) => {
    logger.info('Entering /request route', { user: req.user, headers: req.headers });
    next();
  },
  RideMiddleware.protect, // Use a simple protect middleware
  (req, res, next) => {
    logger.info('After protect middleware', { user: req.user });
    next();
  },
  RideMiddleware.restrictTo('customer'), // Restrict to customers
  RideMiddleware.validateRideRequest,
  (req, res, next) => {
    logger.info('After all middleware, req.user:', { user: req.user });
    next();
  },
  RideController.requestRide
);

// Payment processing
router.post(
  '/:rideId/payment',
  RideMiddleware.protect,
  RideMiddleware.restrictTo('customer'),
  RideMiddleware.restrictToRideOwner,
  RideMiddleware.validatePayment,
  RideController.processPayment
);

// Schedule a ride
router.patch(
  '/:rideId/schedule',
  RideMiddleware.protect,
  RideMiddleware.restrictTo('customer'),
  RideMiddleware.restrictToRideOwner,
  RideController.scheduleRide
);

// Ride history
router.get(
  '/history',
  RideMiddleware.protect,
  RideMiddleware.restrictTo('customer'),
  RideController.getRideHistory
);

// Track a ride
router.get(
  '/:rideId/track',
  RideMiddleware.protect,
  RideMiddleware.restrictTo('customer'),
  RideMiddleware.restrictToRideOwner,
  RideController.trackRide
);

// Update ride status
router.patch(
  '/:rideId/status',
  RideMiddleware.protect,
  RideMiddleware.restrictTo('customer'),
  RideMiddleware.restrictToRideOwner,
  RideMiddleware.validateRideStatusUpdate,
  RideController.updateRideStatus
);

module.exports = router;
