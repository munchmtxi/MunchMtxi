// src/services/customer/rideTrackingService.js
'use strict';

const { Ride, Driver, RouteOptimization } = require('@models');
const Geolocation2Service = require('@services/geoLocation/Geolocation2Service');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const RideTrackingService = {
  trackRide: catchAsync(async (rideId) => {
    const ride = await Ride.findByPk(rideId, {
      include: [
        { 
          model: Driver, 
          as: 'driver', 
          attributes: ['id', 'name', 'phone_number', 'vehicle_info', 'current_location'],
        },
        { 
          model: RouteOptimization, 
          as: 'routeOptimization', 
          attributes: ['id', 'totalDistance', 'totalDuration', 'polyline', 'driverLocation'],
          required: false,
        },
      ],
    });

    if (!ride) throw new AppError('Ride not found', 404);

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return { status: 'success', ride, tracking: null };
    }

    const driverLocation = ride.driver?.current_location || { lat: -13.9626, lng: 33.7741 };
    let trackingData;

    try {
      const route = await Geolocation2Service.calculateRouteForDriver(
        `${driverLocation.lat},${driverLocation.lng}`,
        ride.dropoffLocation?.address || '-13.9626,33.7741'
      );

      trackingData = {
        driverLocation,
        estimatedDuration: route.duration?.value || 0,
        estimatedDistance: route.distance?.value || 0,
        polyline: route.polyline || '',
      };
    } catch (error) {
      logger.warn('Geolocation service failed, using fallback', { rideId, error: error.message });
      trackingData = {
        driverLocation,
        estimatedDuration: 0,
        estimatedDistance: 0,
        polyline: '',
      };
    }

    logger.info('Tracking ride', { rideId, driverLocation });
    return { status: 'success', ride, tracking: trackingData };
  }),

  getRideHistory: catchAsync(async (customerId, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const { count, rows: rides } = await Ride.findAndCountAll({
      where: { customerId },
      include: [
        { model: Driver, as: 'driver', attributes: ['name'] },
        { 
          model: RouteOptimization, 
          as: 'routeOptimization', 
          attributes: ['id', 'totalDistance', 'totalDuration', 'polyline', 'driverLocation'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']], // Use created_at, not createdAt
      limit,
      offset,
    });

    return {
      rides,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }),

  updateRideStatus: catchAsync(async (rideId, status) => {
    const ride = await Ride.findByPk(rideId, {
      include: [{ model: Driver, as: 'driver', attributes: ['id', 'current_location'] }],
    });

    if (!ride) throw new AppError('Ride not found', 404);

    const validStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

    ride.status = status;
    
    if (status === 'IN_PROGRESS' && !ride.routeOptimizationId) {
      try {
        const route = await Geolocation2Service.calculateRouteForDriver(
          ride.pickupLocation.address,
          ride.dropoffLocation.address
        );

        const optimization = await RouteOptimization.create({
          totalDistance: route.distance?.value || 0,
          totalDuration: route.duration?.value || 0,
          polyline: route.polyline || '',
          driverLocation: ride.driver?.current_location || { lat: 0, lng: 0 },
        });

        ride.routeOptimizationId = optimization.id;
      } catch (error) {
        logger.warn('Route optimization failed, proceeding without', { rideId, error: error.message });
      }
    }

    await ride.save();

    logger.info('Ride status updated', { rideId, status });
    return ride;
  }),
};

module.exports = RideTrackingService;