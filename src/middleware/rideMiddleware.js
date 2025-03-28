const { Ride, Customer, User } = require('@models');
const { RIDE_TYPES } = require('@config/constants/rideTypes');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const jwt = require('jsonwebtoken');

const RideMiddleware = {
  protect: catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      logger.warn('No token provided in request', { path: req.path });
      throw new AppError('No token provided', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('JWT verified', { userId: decoded.id });
    } catch (error) {
      logger.error('JWT verification failed', { error: error.message, token });
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Customer, as: 'customer_profile' }],
    });
    if (!user) {
      logger.warn('User not found for token', { userId: decoded.id });
      throw new AppError('User not found', 404);
    }

    req.user = {
      id: user.id,
      role: user.role_id === 19 ? 'merchant' : 'customer',
      customerId: user.customer_profile?.id,
    };
    logger.info('User authenticated', { userId: req.user.id, role: req.user.role });
    next();
  }),

  restrictTo: (...roles) => catchAsync(async (req, res, next) => { // Wrap with catchAsync
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Role restriction failed', { userRole: req.user?.role, required: roles });
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  }),

  restrictToRideOwner: catchAsync(async (req, res, next) => {
    const { rideId } = req.params;
    const customerId = req.user.customerId;

    const ride = await Ride.findByPk(rideId);
    if (!ride) throw new AppError('Ride not found', 404);
    if (ride.customerId !== customerId) {
      logger.warn('Unauthorized ride access attempt', { rideId, customerId });
      throw new AppError('You do not have permission to access this ride', 403);
    }

    req.ride = ride;
    next();
  }),

  validateRideRequest: catchAsync(async (req, res, next) => {
    const { pickup, dropoff, rideType, scheduleTime } = req.body;

    if (!pickup || !dropoff || !rideType) {
      throw new AppError('Pickup, dropoff, and ride type are required', 400);
    }

    if (!RIDE_TYPES.some(t => t.type === rideType)) {
      throw new AppError('Invalid ride type', 400);
    }

    if (scheduleTime) {
      const scheduled = new Date(scheduleTime);
      if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
        throw new AppError('Scheduled time must be a valid future date', 400);
      }
    }

    next();
  }),

  validatePayment: catchAsync(async (req, res, next) => {
    const { payment_method, amount } = req.body;

    if (!payment_method) {
      throw new AppError('Payment method is required', 400);
    }

    const validMethods = ['BANK_CARD', 'MOBILE_MONEY'];
    if (!validMethods.includes(payment_method)) {
      throw new AppError('Invalid payment method', 400);
    }

    if (amount && (typeof amount !== 'number' || amount <= 0)) {
      throw new AppError('Amount must be a positive number', 400);
    }

    next();
  }),

  validateRideStatusUpdate: catchAsync(async (req, res, next) => {
    const { rideId } = req.params;
    const { status } = req.body;

    const ride = await Ride.findByPk(rideId);
    if (!ride) throw new AppError('Ride not found', 404);

    const validStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const allowedTransitions = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      SCHEDULED: ['PENDING', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED'],
      PAYMENT_CONFIRMED: ['ACCEPTED'],
    };

    if (allowedTransitions[ride.status] && !allowedTransitions[ride.status].includes(status)) {
      throw new AppError(`Cannot transition from ${ride.status} to ${status}`, 400);
    }

    req.ride = ride;
    next();
  }),
};

module.exports = RideMiddleware;