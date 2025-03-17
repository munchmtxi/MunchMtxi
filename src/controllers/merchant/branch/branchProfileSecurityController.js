// src/controllers/merchant/branch/branchProfileSecurityController.js
'use strict';
const branchProfileSecurityService = require('@services/merchant/branch/branchProfileSecurityService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const branchProfileSecurityController = {
  /**
   * Update the merchant's password for a branch profile.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async updatePassword(req, res, next) {
    try {
      const { user: { id: userId, merchantId }, params: { branchId }, body: { newPassword } } = req;

      logger.debug('Updating password for branch profile', { userId, branchId });

      const result = await branchProfileSecurityService.updatePassword(userId, newPassword, branchId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in updatePassword controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Configure 2FA for a merchant tied to a branch.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async configure2FA(req, res, next) {
    try {
      const { user: { merchantId }, params: { branchId }, body: { preferredMethod, backupEmail, backupPhone } } = req;

      logger.debug('Configuring 2FA for branch profile', { merchantId, branchId });

      const result = await branchProfileSecurityService.configure2FA(merchantId, branchId, {
        preferredMethod,
        backupEmail,
        backupPhone,
      });
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in configure2FA controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Enable 2FA for a merchant tied to a branch after verification.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async enable2FA(req, res, next) {
    try {
      const { user: { merchantId }, params: { branchId }, body: { twoFactorCode } } = req;

      logger.debug('Enabling 2FA for branch profile', { merchantId, branchId });

      const result = await branchProfileSecurityService.enable2FA(merchantId, branchId, twoFactorCode);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in enable2FA controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Verify 2FA for a merchant tied to a branch (for sensitive actions).
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async verify2FA(req, res, next) {
    try {
      const { user: { merchantId }, params: { branchId }, body: { twoFactorCode, backupCode } } = req;

      logger.debug('Verifying 2FA for branch profile', { merchantId, branchId });

      const result = await branchProfileSecurityService.verify2FA(merchantId, branchId, { twoFactorCode, backupCode });
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in verify2FA controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Disable 2FA for a merchant tied to a branch.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async disable2FA(req, res, next) {
    try {
      const { user: { merchantId }, params: { branchId } } = req;

      logger.debug('Disabling 2FA for branch profile', { merchantId, branchId });

      const result = await branchProfileSecurityService.disable2FA(merchantId, branchId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in disable2FA controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Regenerate backup codes for a merchant tied to a branch.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async regenerateBackupCodes(req, res, next) {
    try {
      const { user: { merchantId }, params: { branchId } } = req;

      logger.debug('Regenerating backup codes for branch profile', { merchantId, branchId });

      const backupCodes = await branchProfileSecurityService.regenerateBackupCodes(merchantId, branchId);
      res.status(200).json({
        status: 'success',
        data: { backupCodes },
      });
    } catch (error) {
      logger.error('Error in regenerateBackupCodes controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },
};

module.exports = branchProfileSecurityController;