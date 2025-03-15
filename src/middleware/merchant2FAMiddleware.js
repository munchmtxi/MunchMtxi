// src/middleware/merchant2FAMiddleware.js
'use strict';
const jwt = require('jsonwebtoken');
const { Merchant2FA, User, Merchant } = require('@models');
const merchant2FAService = require('@services/merchant/profile/merchant2FAService');
const AppError = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');

const merchant2FAMiddleware = catchAsync(async (req, res, next) => {
  logger.info('Entering merchant2FAMiddleware', { path: req.path });

  // Extract and validate JWT
  const token = req.headers.authorization?.split(' ')[1];
  logger.debug('Token extracted', { token: token ? '[present]' : '[missing]' });
  if (!token) throw new AppError('No token provided', 401, 'NO_TOKEN');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('JWT decoded successfully', { userId: decoded.id, role: decoded.role, exp: decoded.exp });
  } catch (error) {
    logger.error('JWT verification failed', { error: error.message, token });
    throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  // Fetch user and merchant data
  logger.debug('Fetching user data', { userId: decoded.id });
  const user = await User.findByPk(decoded.id, {
    include: [{ model: Merchant, as: 'merchant_profile' }],
  });
  if (!user) {
    logger.warn('User not found', { userId: decoded.id });
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Role check: Ensure merchant (role_id: 19)
  logger.debug('Checking role', { roleId: user.role_id });
  if (user.role_id !== 19) {
    logger.warn('Non-merchant role attempted 2FA', { roleId: user.role_id });
    throw new AppError('This route is only for merchants', 403, 'NOT_MERCHANT');
  }

  // Set req.user
  req.user = {
    id: user.id,
    merchantId: user.merchant_profile?.id,
    roleId: user.role_id,
  };
  logger.info('User authenticated', { user: req.user });

  // 2FA-specific logic
  const merchantId = req.user.merchantId;
  logger.debug('Fetching 2FA data', { merchantId });
  const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });

  const path = req.path.toLowerCase();
  logger.debug('Checking path for 2FA requirement', { path });
  if (['/setup', '/enable', '/verify'].includes(path)) {
    req.merchant2FA = merchant2FA;
    logger.info('Skipping 2FA check for setup/enable/verify', { path });
    return next();
  }

  if (!merchant2FA || !merchant2FA.is_enabled) {
    logger.warn('2FA not enabled', { merchantId });
    throw new AppError('2FA is not enabled', 400, '2FA_NOT_ENABLED');
  }

  const twoFAToken = req.body.token || req.headers['x-2fa-token'];
  logger.debug('2FA token check', { twoFAToken: twoFAToken ? '[present]' : '[missing]' });
  if (!twoFAToken) throw new AppError('2FA token required', 401, '2FA_TOKEN_MISSING');

  try {
    const isValid = await merchant2FAService.verify2FA(merchantId, twoFAToken);
    if (!isValid) throw new AppError('Invalid 2FA token', 401, '2FA_TOKEN_INVALID');
    logger.info('2FA verified successfully', { merchantId });
  } catch (error) {
    logger.error('2FA verification failed', { merchantId, error: error.message });
    throw error;
  }

  req.merchant2FA = merchant2FA;
  next();
});

module.exports = merchant2FAMiddleware;