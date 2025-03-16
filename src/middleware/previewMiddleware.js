const jwt = require('jsonwebtoken');
const { User } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const TokenService = require('@services/common/tokenService');
const PreviewService = require('@services/merchant/profile/previewService');

const requireMerchantRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('No token provided', 401, 'NO_TOKEN'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.sub || decoded.id);
    if (isBlacklisted) {
      return next(new AppError('Token is no longer valid', 401, 'TOKEN_BLACKLISTED'));
    }

    const userId = decoded.sub || decoded.id;
    const user = await User.findByPk(userId, { attributes: ['id', 'role_id'] });
    if (!user) {
      logger.error('User not found in database', { userId, token });
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }
    if (user.role_id !== 19) {
      return next(new AppError('This route is only accessible to merchants', 403, 'ROLE_NOT_MERCHANT'));
    }

    req.user = { id: user.id, roleId: user.role_id };
    logger.info('Merchant role verified', { userId: user.id, roleId: user.role_id });
    next();
  } catch (error) {
    logger.error('Token validation failed', { error: error.message });
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
};

const restrictToPreviewOwner = async (req, res, next) => {
  const merchantId = parseInt(req.params.merchantId);
  const session = await PreviewService.getPreviewSession(merchantId);
  if (!session) {
    return next(new AppError('No active preview session', 404, 'NO_PREVIEW_SESSION'));
  }
  if (session.userId !== req.user.id) {
    logger.warn('Unauthorized preview access attempt', { userId: req.user.id, merchantId });
    return next(new AppError('Unauthorized to access this preview', 403, 'UNAUTHORIZED_PREVIEW'));
  }
  req.previewSession = session;
  next();
};

const validatePreviewSession = async (req, res, next) => {
  const merchantId = parseInt(req.params.merchantId);
  const session = await PreviewService.getPreviewSession(merchantId);
  if (!session) {
    return next(new AppError('No active preview session found', 404, 'NO_PREVIEW_SESSION'));
  }
  next();
};

const logPreviewActivity = (action) => {
  return (req, res, next) => {
    const merchantId = req.merchantId || parseInt(req.params.merchantId); // Use req.merchantId if set
    logger.info(action, { userId: req.user.id, merchantId });
    next();
  };
};

const preventConcurrentPreviews = async (req, res, next) => {
  const merchantId = req.merchantId || parseInt(req.params.merchantId); // Use req.merchantId if set
  const session = await PreviewService.getPreviewSession(merchantId);
  if (session && req.method === 'POST') {
    logger.warn('Concurrent preview attempt blocked', { userId: req.user.id, merchantId });
    return next(new AppError('A preview session is already active for this merchant', 409, 'PREVIEW_CONFLICT'));
  }
  next();
};

module.exports = {
  requireMerchantRole,
  restrictToPreviewOwner,
  validatePreviewSession,
  logPreviewActivity,
  preventConcurrentPreviews,
};