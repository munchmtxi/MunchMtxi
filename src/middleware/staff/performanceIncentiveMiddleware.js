'use strict';

const jwt = require('jsonwebtoken');
const AppError = require('@utils/AppError');
const { User } = require('@models');
const { logger } = require('@utils/logger');

const performanceIncentiveMiddleware = {
  verifyToken: async (req, res, next) => {
    try {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      }
      if (!token) {
        return next(new AppError('No token provided', 401, 'NO_TOKEN'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('JWT Payload received:', decoded);

      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
      }

      req.user = {
        id: user.id,
        roleId: user.role_id,
        role: decoded.role,
      };

      const { staffId } = req.params;
      logger.info('Request details:', { path: req.path, params: req.params, staffId });

      if (typeof staffId === 'undefined') {
        return next(new AppError('staffId parameter is missing', 400, 'MISSING_STAFF_ID'));
      }

      const parsedStaffId = parseInt(staffId, 10);
      if (isNaN(parsedStaffId)) {
        return next(new AppError('staffId must be a valid number', 400, 'INVALID_STAFF_ID'));
      }

      logger.info('Staff ID check:', { staffId, parsedStaffId, userId: user.id });

      if (parsedStaffId !== user.id) {
        return next(new AppError('You can only access your own performance data', 403, 'UNAUTHORIZED_STAFF_ID'));
      }

      next();
    } catch (error) {
      logger.error('Token verification failed:', { message: error.message });
      return next(new AppError('Invalid token. Please log in again', 401, 'INVALID_TOKEN'));
    }
  },

  validateRedeemBody: (req, res, next) => {
    const { rewardType, pointsToRedeem } = req.body;
    const validRewards = ['gift_card', 'time_off', 'cash'];

    if (!rewardType || !validRewards.includes(rewardType)) {
      return next(new AppError('Valid rewardType (gift_card, time_off, cash) is required', 400, 'INVALID_REWARD_TYPE'));
    }
    if (!pointsToRedeem || isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      return next(new AppError('Valid pointsToRedeem is required and must be positive', 400, 'INVALID_POINTS'));
    }
    next();
  },
};

module.exports = performanceIncentiveMiddleware;