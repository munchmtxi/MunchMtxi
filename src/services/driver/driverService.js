'use strict';

const { Driver, Ride, Route, Payment, Notification, DriverRatings, Device, DriverAvailability, Customer } = require('@models');
const PaymentService = require('@services/common/paymentService');
const NotificationService = require('@services/notifications/core/notificationService');
const TokenService = require('@services/common/tokenService');
const Geolocation2Service = require('@services/geoLocation/Geolocation2Service');
const AppError = require('@utils/AppError');
const { logger, PerformanceMonitor } = require('@utils/logger');
const mathUtils = require('@utils/mathUtils');
const { Op } = require('sequelize');

/**
 * DriverService handles the driver-side logic for ride-hailing operations,
 * including driver matching, ride acceptance, and completion.
 */
const DriverService = {
  /**
   * Matches an available driver to a ride request based on proximity and vehicle type.
   * @param {number} rideId - The ID of the ride to match a driver to.
   * @returns {Promise<Object>} The matched driver and ride details.
   */
  matchDriverToRide: async (rideId) => {
    logger.info('Matching driver to ride', { rideId });

    const ride = await Ride.findByPk(rideId, {
      include: [{ model: Route, as: 'route', attributes: ['distance'] }],
    });
    if (!ride) {
      logger.error('Ride not found for matching', { rideId });
      throw new AppError('Ride not found', 404);
    }
    if (ride.status !== 'PENDING') {
      logger.warn('Ride not in PENDING status for matching', { rideId, status: ride.status });
      throw new AppError('Ride is not available for matching', 400);
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    const drivers = await Driver.findAll({
      include: [{
        model: DriverAvailability,
        as: 'availability',
        where: {
          date: currentDate,
          start_time: { [Op.lte]: currentTime },
          end_time: { [Op.gte]: currentTime },
          status: 'available',
          isOnline: true,
        },
        required: true,
      }],
      attributes: ['id', 'name', 'current_location', 'vehicle_info', 'last_location_update'],
      order: [['last_location_update', 'DESC']],
    });

    if (!drivers.length) {
      logger.warn('No available drivers found', { rideId });
      throw new AppError('No available drivers at this time', 503);
    }

    const pickupCoords = ride.pickupLocation.coordinates;
    let closestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      const driverCoords = driver.current_location;
      if (!driverCoords || !driverCoords.lat || !driverCoords.lng) {
        logger.warn('Driver missing location data', { driverId: driver.id });
        continue;
      }

      const distance = mathUtils.calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        driverCoords.lat,
        driverCoords.lng
      );
      logger.debug('Distance calculated', { driverId: driver.id, distance });

      const vehicleType = driver.vehicle_info.type;
      const isCompatible = DriverService.isVehicleCompatible(vehicleType, ride.rideType);
      if (!isCompatible) {
        logger.debug('Driver vehicle incompatible', { driverId: driver.id, vehicleType, rideType: ride.rideType });
        continue;
      }

      if (distance < minDistance) {
        minDistance = distance;
        closestDriver = driver;
      }
    }

    if (!closestDriver) {
      logger.warn('No compatible drivers found', { rideId });
      throw new AppError('No compatible drivers available', 503);
    }

    ride.driverId = closestDriver.id;
    ride.status = 'ACCEPTED';
    await ride.save();

    const route = await Geolocation2Service.calculateRouteForDriver(
      `${closestDriver.current_location.lat},${closestDriver.current_location.lng}`,
      ride.pickupLocation.address
    );
    await Route.create({
      rideId: ride.id,
      distance: route.distance.value / 1000,
      polyline: route.polyline,
    });

    logger.logApiEvent('Driver matched to ride', { rideId, driverId: closestDriver.id, distance: minDistance });
    PerformanceMonitor.trackRequest('/driver/match', 'POST', 100, 200, closestDriver.id);

    return { ride, driver: closestDriver, route };
  },

  /**
   * Accepts a ride assignment by the driver.
   * @param {number} driverId - The ID of the driver accepting the ride.
   * @param {number} rideId - The ID of the ride to accept.
   * @returns {Promise<Object>} The updated ride details.
   */
  acceptRide: async (driverId, rideId) => {
    logger.info('Driver accepting ride', { driverId, rideId });

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      logger.error('Ride not found for acceptance', { rideId });
      throw new AppError('Ride not found', 404);
    }
    if (ride.driverId !== driverId) {
      logger.warn('Driver not assigned to this ride', { driverId, rideId });
      throw new AppError('You are not assigned to this ride', 403);
    }
    if (ride.status !== 'ACCEPTED') {
      logger.warn('Ride not in ACCEPTED status', { rideId, status: ride.status });
      throw new AppError('Ride cannot be accepted at this stage', 400);
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    const availability = await DriverAvailability.findOne({
      where: {
        driver_id: driverId,
        date: currentDate,
        start_time: { [Op.lte]: currentTime },
        end_time: { [Op.gte]: currentTime },
        status: 'available',
        isOnline: true,
      },
    });

    if (!availability) {
      logger.warn('Driver not available or not found', { driverId });
      throw new AppError('Driver unavailable', 400);
    }

    ride.status = 'IN_PROGRESS';
    availability.status = 'busy';
    availability.lastUpdated = now;
    await Promise.all([ride.save(), availability.save()]);

    const driver = await Driver.findByPk(driverId);
    const customer = await Customer.findByPk(ride.customerId);
    if (!customer || !customer.user_id) {
      logger.error('Customer user mapping not found', { customerId: ride.customerId });
      throw new AppError('Customer user mapping not found', 400);
    }

    await NotificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'ride_accepted', parameters: { driverName: driver.name } },
      content: `Your ride has been accepted by ${driver.name}`,
      recipient: customer.user_id, // Use user_id from Customer
    });

    logger.logApiEvent('Ride accepted by driver', { rideId, driverId });
    PerformanceMonitor.trackRequest('/driver/accept', 'PATCH', 50, 200, driverId);

    return ride;
  },

  /**
   * Completes a ride and processes payment.
   * @param {number} driverId - The ID of the driver completing the ride.
   * @param {number} rideId - The ID of the ride to complete.
   * @returns {Promise<Object>} The completed ride and payment details.
   */
  completeRide: async (driverId, rideId) => {
    logger.info('Completing ride', { driverId, rideId });

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: Route, as: 'route' },
        { model: Payment, as: 'payment' },
      ],
    });
    if (!ride) {
      logger.error('Ride not found for completion', { rideId });
      throw new AppError('Ride not found', 404);
    }
    if (ride.driverId !== driverId) {
      logger.warn('Driver not assigned to this ride', { driverId, rideId });
      throw new AppError('You are not assigned to this ride', 403);
    }
    if (ride.status !== 'IN_PROGRESS') {
      logger.warn('Ride not in IN_PROGRESS status', { rideId, status: ride.status });
      throw new AppError('Ride cannot be completed at this stage', 400);
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    const availability = await DriverAvailability.findOne({
      where: {
        driver_id: driverId,
        date: currentDate,
        start_time: { [Op.lte]: currentTime },
        end_time: { [Op.gte]: currentTime },
        status: 'busy',
      },
    });

    if (!availability) {
      logger.error('Driver availability record not found', { driverId });
      throw new AppError('Driver availability record not found', 400);
    }

    const baseFare = 5.0;
    const distanceFare = (ride.route?.distance || 0) * 1.5;
    const fare = mathUtils.roundToDecimal(baseFare + distanceFare, 2);

    const paymentData = {
      amount: fare,
      customer_id: ride.customerId,
      driver_id: driverId,
      order_id: null,
      merchant_id: null,
      bank_name: 'DefaultBank',
      card_details: {},
    };
    const payment = await PaymentService.initiateBankCardPayment(paymentData);
    await PaymentService.verifyPayment(payment.id);

    ride.paymentId = payment.id;
    ride.status = 'COMPLETED';
    availability.status = 'available';
    availability.lastUpdated = now;
    await Promise.all([ride.save(), availability.save()]);

    await DriverRatings.create({
      driver_id: driverId,
      ride_id: rideId,
      rating: 5.0,
    });

    const customer = await Customer.findByPk(ride.customerId);
    if (!customer || !customer.user_id) {
      logger.error('Customer user mapping not found', { customerId: ride.customerId });
      throw new AppError('Customer user mapping not found', 400);
    }

    await NotificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'ride_completed', parameters: { fare } },
      content: `Your ride is completed. Total fare: $${fare}`,
      recipient: customer.user_id, // Use user_id from Customer
    });

    logger.logTransactionEvent('Ride completed and payment processed', { rideId, driverId, paymentId: payment.id, fare });
    PerformanceMonitor.trackRequest('/driver/complete', 'PATCH', 75, 200, driverId);

    return { ride, payment };
  },

  /**
   * Checks if a vehicle type is compatible with a ride type.
   * @param {string} vehicleType - The driver's vehicle type.
   * @param {string} rideType - The requested ride type.
   * @returns {boolean} True if compatible, false otherwise.
   */
  isVehicleCompatible(vehicleType, rideType) {
    const compatibility = {
      BICYCLE: ['STANDARD'],
      MOTORBIKE: ['STANDARD', 'QUICK'],
      CAR: ['STANDARD', 'PREMIUM'],
      VAN: ['GROUP'],
    };
    return compatibility[vehicleType]?.includes(rideType) || false;
  },

  /**
   * Updates the driver's current location.
   * @param {number} driverId - The ID of the driver.
   * @param {Object} location - The new location { lat, lng }.
   * @returns {Promise<Object>} The updated driver.
   */
  updateLocation: async (driverId, location) => {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      logger.error('Driver not found for location update', { driverId });
      throw new AppError('Driver not found', 404);
    }

    driver.current_location = location;
    driver.last_location_update = new Date();
    await driver.save();

    logger.debug('Driver location updated', { driverId, location });
    return driver;
  },
};

module.exports = DriverService;