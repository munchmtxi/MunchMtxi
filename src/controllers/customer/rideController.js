// src/controllers/customer/rideController.js
const RideBookingService = require('@services/customer/rideBookingService');
const RideTrackingService = require('@services/customer/rideTrackingService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const RideController = {
  requestRide: catchAsync(async (req, res, next) => {
    logger.info('Entering requestRide', { user: req.user });
    if (!req.user || !req.user.id) {
      logger.error('User not authenticated in requestRide', { headers: req.headers });
      throw new AppError('Authentication required', 401);
    }
    const userId = req.user.id;
    const { pickup, dropoff, rideType, scheduleTime } = req.body;

    const ride = await RideBookingService.requestRide(userId, { pickup, dropoff, rideType, scheduleTime });

    logger.info('Ride request successful', { rideId: ride.id, userId });
    res.status(201).json({ status: 'success', data: { ride } });
  }),

  processPayment: catchAsync(async (req, res) => {
    const { rideId } = req.params;
    const paymentDetails = req.body;

    const { ride, payment } = await RideBookingService.processPayment(rideId, paymentDetails);

    if (!ride || !payment) {
      logger.error('Payment processing failed', { rideId });
      throw new AppError('Failed to process payment', 500);
    }

    res.status(200).json({
      status: 'success',
      data: { ride, payment },
    });
  }),

  scheduleRide: catchAsync(async (req, res) => {
    const { rideId } = req.params;
    const { scheduleTime } = req.body;

    const ride = await RideBookingService.scheduleRide(rideId, new Date(scheduleTime));

    if (!ride) {
      logger.error('Ride scheduling failed', { rideId });
      throw new AppError('Failed to schedule ride', 500);
    }

    res.status(200).json({
      status: 'success',
      data: { ride },
    });
  }),

  trackRide: catchAsync(async (req, res) => {
    const { rideId } = req.params;

    const trackingData = await RideTrackingService.trackRide(rideId);
    logger.info('Track ride response prepared', { rideId, trackingData });

    res.status(200).json(trackingData); // Send full response
  }),

  getRideHistory: catchAsync(async (req, res) => {
    const customerId = req.user.customerId || req.user.id; // Use customerId if available
    const { page, limit } = req.query;

    const history = await RideTrackingService.getRideHistory(customerId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    res.status(200).json({
      status: 'success',
      data: history,
    });
  }),

  updateRideStatus: catchAsync(async (req, res) => {
    const { rideId } = req.params;
    const { status } = req.body;

    const ride = await RideTrackingService.updateRideStatus(rideId, status);

    if (!ride) {
      logger.error('Ride status update failed', { rideId, status });
      throw new AppError('Failed to update ride status', 500);
    }

    res.status(200).json({
      status: 'success',
      data: { ride },
    });
  }),
};

module.exports = RideController;