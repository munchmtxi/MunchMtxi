'use strict';
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const bcrypt = require('bcryptjs');
const { User, Merchant, MerchantBranch, Device, Merchant2FA, Merchant2FABackupCode, PasswordHistory } = require('@models');
const AppError = require('@utils/AppError');
const { logger, logSecurityEvent, logTransactionEvent } = require('@utils/logger');
const roleService = require('@services/common/roleService');
const TokenService = require('@services/common/tokenService');
const config = require('@config/config');
const { trackDevice } = require('@services/common/deviceService');
const { rateLimiter } = require('@middleware/rateLimiter');

/**
 * Authenticate merchant and set user context for secure branch actions.
 */
const secureBranchProfile = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;
    if (!token) {
      logger.warn('No token provided', { path: req.path });
      return next(new AppError('Authentication token required', 401, 'NO_TOKEN'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    logger.debug('Token decoded', { userId: decoded.id });

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Merchant, as: 'merchant_profile' }],
    });
    if (!user || !user.merchant_profile || user.role_id !== 19) {
      logger.warn('Invalid merchant user', { userId: decoded.id });
      return next(new AppError('Restricted to merchants', 403, 'ROLE_RESTRICTED'));
    }

    const isBlacklisted = await TokenService.isTokenBlacklisted(user.id);
    if (isBlacklisted) {
      logger.warn('Blacklisted token', { userId: user.id });
      return next(new AppError('Token is no longer valid', 401, 'TOKEN_BLACKLISTED'));
    }

    const deviceInfo = {
      deviceId: req.headers['x-device-id'] || req.body.deviceId,
      deviceType: req.headers['x-device-type'] || req.body.deviceType,
    };
    if (deviceInfo.deviceId && deviceInfo.deviceType) {
      await trackDevice(user.id, deviceInfo);
      const device = await Device.findOne({ where: { user_id: user.id, device_id: deviceInfo.deviceId } });
      if (!device) {
        logger.warn('Unrecognized device', { userId: user.id, deviceId: deviceInfo.deviceId });
        return next(new AppError('Unrecognized device', 403, 'DEVICE_UNRECOGNIZED'));
      }
    }

    req.user = {
      id: user.id,
      merchantId: user.merchant_profile.id,
      role: 'merchant',
      roleId: user.role_id,
    };

    logger.info('Merchant authenticated', { userId: user.id });
    next();
  } catch (error) {
    logger.error('Authentication error', { message: error.message, stack: error.stack });
    return next(
      error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
        ? new AppError('Invalid or expired token', 401, 'TOKEN_INVALID')
        : new AppError('Authentication failed', 500, 'AUTH_FAILURE')
    );
  }
};

/**
 * Verify branch ownership for secure actions.
 */
const verifySecureBranchOwnership = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      logger.warn('Branch ID missing', { path: req.path });
      return next(new AppError('Branch ID required', 400, 'MISSING_BRANCH_ID'));
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== req.user.merchantId) {
      logger.warn('Unauthorized branch access', { merchantId: req.user.merchantId, branchId });
      return next(new AppError('Unauthorized branch access', 403, 'UNAUTHORIZED_BRANCH'));
    }

    req.branch = branch;
    logSecurityEvent('Branch ownership verified', { merchantId: req.user.merchantId, branchId });
    next();
  } catch (error) {
    logger.error('Ownership verification error', { message: error.message });
    return next(new AppError('Ownership check failed', 500, 'OWNERSHIP_CHECK_FAILURE'));
  }
};

/**
 * Check permission for secure branch actions.
 * @param {string} action - The action to check (e.g., 'update_password', 'configure_2fa').
 */
const hasSecureBranchPermission = (action) => {
  return async (req, res, next) => {
    try {
      const permissions = await roleService.getRolePermissions(req.user.roleId);
      const canPerform = permissions.some(p => p.action === action && p.resource === 'branch_profile');
      if (!canPerform) {
        logger.warn('Permission denied', { action, userId: req.user.id });
        return next(new AppError(`No permission to ${action}`, 403, 'PERMISSION_DENIED'));
      }
      logTransactionEvent('Permission granted', { action, userId: req.user.id });
      next();
    } catch (error) {
      logger.error('Permission check error', { message: error.message });
      return next(new AppError('Permission check failed', 500, 'PERMISSION_CHECK_FAILURE'));
    }
  };
};

/**
 * Enforce 2FA for sensitive actions if enabled.
 */
const enforce2FA = async (req, res, next) => {
  try {
    const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: req.user.merchantId } });
    if (!merchant2FA || !merchant2FA.is_enabled) {
      logger.debug('2FA not enabled', { merchantId: req.user.merchantId });
      return next();
    }

    const { twoFactorCode, backupCode } = req.body;
    if (!twoFactorCode && !backupCode) {
      logger.warn('2FA required but not provided', { merchantId: req.user.merchantId });
      return next(new AppError('Two-factor authentication required', 403, '2FA_REQUIRED'));
    }

    if (twoFactorCode) {
      const isValid = speakeasy.totp.verify({
        secret: merchant2FA.secret_key,
        encoding: 'base32',
        token: twoFactorCode,
      });
      if (!isValid) {
        logger.warn('Invalid 2FA code', { merchantId: req.user.merchantId });
        return next(new AppError('Invalid 2FA code', 401, '2FA_INVALID'));
      }
      await merchant2FA.update({ last_verified: new Date() });
      logSecurityEvent('2FA verified', { merchantId: req.user.merchantId });
    } else if (backupCode) {
      const backup = await Merchant2FABackupCode.findOne({
        where: { merchant_2fa_id: merchant2FA.id, code: backupCode, is_used: false },
      });
      if (!backup) {
        logger.warn('Invalid or used backup code', { merchantId: req.user.merchantId });
        return next(new AppError('Invalid or used backup code', 401, 'BACKUP_CODE_INVALID'));
      }
      await backup.update({ is_used: true, used_at: new Date() });
      logSecurityEvent('Backup code used', { merchantId: req.user.merchantId, backupCodeId: backup.id });
    }

    logger.debug('2FA enforcement passed', { merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('2FA enforcement error', { message: error.message });
    return next(new AppError('2FA check failed', 500, '2FA_CHECK_FAILURE'));
  }
};

/**
 * Validate new password against history and strength requirements.
 */
const validatePasswordUpdate = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      logger.warn('Invalid password provided', { userId: req.user.id });
      return next(new AppError('Password must be at least 8 characters', 400, 'INVALID_PASSWORD'));
    }

    const history = await PasswordHistory.findAll({
      where: { user_id: req.user.id, user_type: 'merchant' },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    for (const entry of history) {
      if (await bcrypt.compare(newPassword, entry.password_hash)) {
        logger.warn('Password reuse detected', { userId: req.user.id });
        return next(new AppError('Cannot reuse a previous password', 400, 'PASSWORD_REUSED'));
      }
    }

    logger.debug('Password validated', { userId: req.user.id });
    next();
  } catch (error) {
    logger.error('Password validation error', { message: error.message });
    return next(new AppError('Password validation failed', 500, 'PASSWORD_VALIDATION_FAILURE'));
  }
};

/**
 * Rate limit secure branch actions.
 */
const rateLimitBranchAction = rateLimiter;

/**
 * Validate 2FA configuration inputs.
 */
const validate2FAConfig = (req, res, next) => {
  try {
    const { preferredMethod, backupEmail, backupPhone } = req.body;
    const validMethods = ['authenticator', 'sms', 'email', 'biometric'];

    if (preferredMethod && !validMethods.includes(preferredMethod)) {
      logger.warn('Invalid 2FA method', { preferredMethod });
      return next(new AppError('Invalid 2FA method', 400, 'INVALID_2FA_METHOD'));
    }

    if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
      logger.warn('Invalid backup email', { backupEmail });
      return next(new AppError('Invalid backup email', 400, 'INVALID_BACKUP_EMAIL'));
    }

    if (backupPhone && !/^\+?[1-9]\d{1,14}$/.test(backupPhone)) {
      logger.warn('Invalid backup phone', { backupPhone });
      return next(new AppError('Invalid backup phone', 400, 'INVALID_BACKUP_PHONE'));
    }

    logger.debug('2FA config inputs validated', { merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('2FA config validation error', { message: error.message });
    return next(new AppError('2FA config validation failed', 400, '2FA_CONFIG_VALIDATION_FAILURE'));
  }
};

module.exports = {
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission,
  enforce2FA,
  validatePasswordUpdate,
  rateLimitBranchAction,
  validate2FAConfig,
};
