'use strict';

const DriverService = require('@services/driver/driverService');
const catchAsync = require('@utils/catchAsync');
const { logger, PerformanceMonitor } = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * DriverController handles HTTP requests related to driver operations
 * for the ride-hailing process in the MunchMtxi system.
 */
const DriverController = {
  /**
   * Matches a driver to a ride request.
   * @route POST /api/v1/driver/rides/:rideId/match
   */
  matchDriverToRide: catchAsync(async (req, res, next) => {
    const { rideId } = req.params;
    logger.info('Driver match request received', { rideId, driverId: req.user?.id });

    const { ride, driver, route } = await DriverService.matchDriverToRide(rideId);

    res.status(200).json({
      status: 'success',
      data: {
        ride: {
          id: ride.id,
          status: ride.status,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
        },
        driver: {
          id: driver.id,
          name: driver.name,
          vehicle: driver.vehicle_info,
        },
        route: {
          distance: route.distance,
          polyline: route.polyline,
        },
      },
    });
  }),

  /**
   * Allows a driver to accept an assigned ride.
   * @route PATCH /api/v1/driver/rides/:rideId/accept
   */
  acceptRide: catchAsync(async (req, res, next) => {
    const { rideId } = req.params;
    const driverId = req.user.id; // Assumes driver ID comes from auth middleware
    logger.info('Ride acceptance request received', { rideId, driverId });

    const ride = await DriverService.acceptRide(driverId, rideId);

    res.status(200).json({
      status: 'success',
      data: {
        ride: {
          id: ride.id,
          status: ride.status,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
        },
      },
    });
  }),

  /**
   * Completes a ride and processes payment.
   * @route PATCH /api/v1/driver/rides/:rideId/complete
   */
  completeRide: catchAsync(async (req, res, next) => {
    const { rideId } = req.params;
    const driverId = req.user.id; // Assumes driver ID from auth middleware
    logger.info('Ride completion request received', { rideId, driverId });

    const { ride, payment } = await DriverService.completeRide(driverId, rideId);

    res.status(200).json({
      status: 'success',
      data: {
        ride: {
          id: ride.id,
          status: ride.status,
          paymentId: ride.paymentId,
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
          tip_amount: payment.tip_amount,
          status: payment.status,
        },
      },
    });
  }),

  /**
   * Updates the driver's current location.
   * @route PATCH /api/v1/driver/location
   */
  updateLocation: catchAsync(async (req, res, next) => {
    const driverId = req.user.id; // Assumes driver ID from auth middleware
    const { lat, lng } = req.body;

    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      logger.warn('Invalid location data provided', { driverId, lat, lng });
      throw new AppError('Invalid location coordinates', 400);
    }

    logger.info('Location update request received', { driverId, lat, lng });

    const driver = await DriverService.updateLocation(driverId, { lat, lng });

    res.status(200).json({
      status: 'success',
      data: {
        driver: {
          id: driver.id,
          current_location: driver.current_location,
          last_location_update: driver.last_location_update,
        },
      },
    });
  }),

  /**
   * Gets the driver's active ride.
   * @route GET /api/v1/driver/rides/active
   */
  getActiveRide: catchAsync(async (req, res, next) => {
    const driverId = req.user.id; // Assumes driver ID from auth middleware
    logger.info('Fetching active ride for driver', { driverId });

    const ride = await Ride.findOne({
      where: {
        driverId,
        status: ['ACCEPTED', 'IN_PROGRESS'],
      },
      include: [
        { model: Route, as: 'route', attributes: ['distance', 'polyline'] },
      ],
    });

    if (!ride) {
      logger.info('No active ride found for driver', { driverId });
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'No active ride found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ride: {
          id: ride.id,
          status: ride.status,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          route: {
            distance: ride.route?.distance,
            polyline: ride.route?.polyline,
          },
        },
      },
    });
  }),
};

module.exports = DriverController;