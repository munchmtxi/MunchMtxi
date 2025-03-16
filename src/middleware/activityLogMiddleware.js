'use strict';
const jwt = require('jsonwebtoken');
const { User, Device, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const activityLogGuard = async (req, res, next) => {
  try {
    // Extract and verify JWT
    const token = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null;
    if (!token) {
      return next(new AppError('Authentication token required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) {
      return next(new AppError('Invalid token payload', 401));
    }

    // Fetch user with merchant profile
    const user = await User.findByPk(decoded.id, { 
      attributes: ['id', 'role_id', 'status'],
      include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id'] }]
    });
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    if (user.status !== 'active') {
      return next(new AppError('User account is inactive', 403));
    }

    // Restrict to merchants (role_id: 19)
    if (user.role_id !== 19) {
      return next(new AppError('This endpoint is restricted to merchants', 403));
    }

    // Get merchantId from user's merchant profile
    const merchantId = user.merchant_profile?.id;
    if (!merchantId) {
      return next(new AppError('No merchant profile associated with this user', 403));
    }

    // Debug: Log request details
    logger.debug('activityLogGuard inspecting request', { 
      params: req.params, 
      userId: user.id, 
      merchantId, 
      url: req.url, 
      originalUrl: req.originalUrl 
    });

    // Extract and validate device info
    const deviceInfo = {
      id: req.headers['x-device-id'] || req.body.deviceId,
      platform: req.headers['x-device-platform'] || req.body.platform || 'unknown',
      browser: req.headers['user-agent']?.split(')')[0].split('(')[1] || req.body.browser || 'unknown',
    };

    if (deviceInfo.id) {
      const device = await Device.findOne({ 
        where: { device_id: deviceInfo.id, user_id: user.id },
        attributes: ['id', 'device_type', 'platform', 'browser', 'os'],
      });
      req.deviceInfo = device ? { 
        id: device.id, 
        platform: device.platform, 
        browser: device.browser 
      } : deviceInfo;
    } else {
      req.deviceInfo = deviceInfo;
    }

    // Attach user and merchant data to request
    req.user = { id: user.id, roleId: user.role_id };
    req.merchantId = merchantId; // Already an integer from DB

    // Method-specific validation
    if (req.method === 'POST') {
      const { eventType, changes } = req.body;
      if (!eventType) {
        return next(new AppError('Event type is required for logging', 400));
      }
      if (changes && typeof changes !== 'object') {
        return next(new AppError('Changes must be a valid JSON object', 400));
      }
    } else if (req.method === 'GET' && req.path.includes('/validate')) {
      // No additional validation needed for validate endpoint
    } else if (req.method === 'GET') {
      const { limit, offset } = req.query;
      if (limit && (isNaN(limit) || limit < 1)) {
        return next(new AppError('Limit must be a positive number', 400));
      }
      if (offset && (isNaN(offset) || offset < 0)) {
        return next(new AppError('Offset must be a non-negative number', 400));
      }
    }

    logger.info('Activity log request authorized', { userId: user.id, merchantId, method: req.method });
    next();
  } catch (error) {
    logger.error('Activity log guard failed', { error: error.message, method: req.method, url: req.url });
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(error instanceof AppError ? error : new AppError('Authentication failed', 500));
  }
};

module.exports = { activityLogGuard };