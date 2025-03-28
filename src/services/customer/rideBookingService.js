'use strict';
const { Customer, Driver, Ride } = require('@models');
const PaymentService = require('@services/common/paymentService');
const Geolocation1Service = require('@services/geoLocation/Geolocation1Service');
const Geolocation2Service = require('@services/geoLocation/Geolocation2Service');
const LocationDetectionService = require('@services/geoLocation/LocationDetectionService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const { RIDE_TYPES } = require('@config/constants/rideTypes');

const RideBookingService = {
  requestRide: async (userId, { pickup, dropoff, rideType, scheduleTime }) => {
    logger.info('Requesting ride for user', { userId, rideType });
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      logger.error('Customer not found for user', { userId });
      throw new AppError('Customer profile not found', 404);
    }
    if (!RIDE_TYPES.some(t => t.type === rideType)) {
      logger.error('Invalid ride type provided', { rideType });
      throw new AppError('Invalid ride type', 400);
    }
    const countryCode = customer.country ? customer.country.toUpperCase() : 'MWI';
    logger.info('Using country code', { userId, countryCode });

    let pickupResult, dropoffResult;
    try {
      [pickupResult, dropoffResult] = await Promise.all([
        Geolocation1Service.validateAddress(pickup, countryCode),
        Geolocation1Service.validateAddress(dropoff, countryCode),
      ]);
    } catch (error) {
      logger.error('Geolocation validation failed', { error: error.message, pickup, dropoff, countryCode });
      throw new AppError('Failed to validate addresses', 500);
    }
    logger.info('Geolocation results', { pickupResult, dropoffResult });

    if (!pickupResult?.validationStatus || !dropoffResult?.validationStatus) {
      logger.error('Invalid geolocation response structure', { pickupResult, dropoffResult });
      throw new AppError('Geolocation service returned invalid data', 500);
    }

    if (pickupResult.validationStatus.status !== 'VALID' || dropoffResult.validationStatus.status !== 'VALID') {
      logger.info('Invalid addresses detected', { pickupResult, dropoffResult });
      if (process.env.NODE_ENV === 'development') {
        pickupResult = {
          formattedAddress: pickup,
          location: { lat: -13.9626, lng: 33.7741 },
          validationStatus: { status: 'VALID', confidence: 'LOW' },
        };
        dropoffResult = {
          formattedAddress: dropoff,
          location: { lat: -13.9500, lng: 33.7800 },
          validationStatus: { status: 'VALID', confidence: 'LOW' },
        };
        logger.warn('Using fallback coordinates in development mode', { pickup, dropoff });
      } else {
        throw new AppError('Invalid pickup or dropoff address', 400, null, {
          pickup: pickupResult,
          dropoff: dropoffResult,
        });
      }
    }

    const driver = await Driver.findOne({
      where: { availability_status: 'available' },
      order: [['last_location_update', 'DESC']],
    });
    if (!driver) {
      logger.warn('No available drivers found', { userId });
      throw new AppError('No available drivers at this time', 503);
    }

    const rideData = {
      customerId: customer.id,
      driverId: driver.id,
      pickupLocation: { address: pickupResult.formattedAddress, coordinates: pickupResult.location },
      dropoffLocation: { address: dropoffResult.formattedAddress, coordinates: dropoffResult.location },
      rideType,
      status: scheduleTime ? 'SCHEDULED' : 'PENDING',
      scheduledTime: scheduleTime || null,
    };

    logger.info('Ride model check', { hasCreate: typeof Ride.create === 'function' });
    if (typeof Ride.create !== 'function') {
      logger.error('Ride.create is not a function', { Ride });
      throw new AppError('Internal server error: Ride model misconfigured', 500);
    }

    const ride = await Ride.create(rideData);
    logger.info('Ride requested', { rideId: ride.id, customerId: customer.id, driverId: driver.id });
    return ride;
  },

  processPayment: async (rideId, paymentDetails) => {
    logger.info('Processing payment for ride', { rideId });
    const ride = await Ride.findByPk(rideId, { include: [{ model: Customer, as: 'customer' }] });
    if (!ride) {
      logger.error('Ride not found for payment processing', { rideId });
      throw new AppError('Ride not found', 404);
    }
    if (ride.status === 'COMPLETED') {
      logger.warn('Attempt to process payment for completed ride', { rideId });
      throw new AppError('Ride already completed', 400);
    }
    const fare = await RideBookingService.calculateFare(ride);
    if (ride.rideType === 'FREE') {
      ride.status = 'PAYMENT_CONFIRMED';
      await ride.save();
      logger.info('Payment skipped for FREE ride', { rideId });
      return { ride, payment: { amount: fare, status: 'skipped' } };
    }
    const paymentData = {
      amount: fare,
      customer_id: ride.customerId,
      order_id: null,
      merchant_id: null,
      ...paymentDetails,
    };
    const payment = await PaymentService.initiateBankCardPayment(paymentData);
    ride.paymentId = payment.id;
    ride.status = 'PAYMENT_CONFIRMED';
    await ride.save();
    logger.info('Payment processed for ride', { rideId, paymentId: payment.id });
    return { ride, payment };
  },

  scheduleRide: async (rideId, scheduleTime) => {
    logger.info('Scheduling ride', { rideId, scheduleTime });
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      logger.error('Ride not found for scheduling', { rideId });
      throw new AppError('Ride not found', 404);
    }
    if (ride.status !== 'SCHEDULED' && ride.status !== 'PENDING') {
      logger.warn('Cannot reschedule ride in current status', { rideId, status: ride.status });
      throw new AppError('Cannot reschedule ride in current status', 400);
    }
    ride.scheduledTime = scheduleTime;
    ride.status = 'SCHEDULED';
    await ride.save();
    logger.info('Ride scheduled successfully', { rideId, scheduleTime });
    return ride;
  },

  calculateFare: async (ride) => {
    logger.info('Calculating fare for ride', { rideId: ride.id });
    const route = await Geolocation2Service.calculateRouteForDriver(
      ride.pickupLocation.address,
      ride.dropoffLocation.address
    );
    const baseFare = RIDE_TYPES.find(t => t.type === ride.rideType)?.baseFare || 5.0;
    const distanceFare = (route.distance.value / 1000) * 1.5;
    const timeFare = (route.duration.value / 3600) * 10;
    const totalFare = baseFare + distanceFare + timeFare;
    logger.info('Fare calculated', { rideId: ride.id, totalFare });
    return totalFare;
  },
};

module.exports = RideBookingService;