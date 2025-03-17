// src/services/merchant/branch/branchProfileSecurityService.js
'use strict';
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { User, Merchant, MerchantBranch, Merchant2FA, Merchant2FABackupCode, PasswordHistory } = require('@models');
const AppError = require('@utils/AppError');
const { logger, logSecurityEvent, logTransactionEvent } = require('@utils/logger');

/**
 * Service for managing branch profile security features like password updates and 2FA.
 */
const branchProfileSecurityService = {
  /**
   * Update the password for a merchant user tied to a branch.
   * @param {number} userId - The ID of the merchant user.
   * @param {string} newPassword - The new password.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @returns {Promise<object>} - Success confirmation.
   */
  async updatePassword(userId, newPassword, branchId) {
    try {
      // Validate password strength
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'INVALID_PASSWORD');
      }

      const user = await User.findByPk(userId);
      if (!user || user.role_id !== 19) {
        throw new AppError('Merchant user not found', 404, 'USER_NOT_FOUND');
      }

      // Check password history
      const history = await PasswordHistory.findAll({
        where: { user_id: userId, user_type: 'merchant' },
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      for (const entry of history) {
        if (await bcrypt.compare(newPassword, entry.password_hash)) {
          logger.warn('Password reuse detected', { userId });
          throw new AppError('Cannot reuse a previous password', 400, 'PASSWORD_REUSED');
        }
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      // Log to password history
      await PasswordHistory.create({
        user_id: userId,
        user_type: 'merchant',
        password_hash: hashedPassword,
      });

      logSecurityEvent('Password updated for branch profile', { userId, branchId });
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      logger.error('Error updating password', { userId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to update password', 500, 'PASSWORD_UPDATE_FAILURE');
    }
  },

  /**
   * Configure 2FA for a merchant tied to a branch.
   * @param {number} merchantId - The ID of the merchant.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @param {object} options - 2FA configuration options.
   * @param {string} [options.preferredMethod] - Preferred 2FA method.
   * @param {string} [options.backupEmail] - Backup email for recovery.
   * @param {string} [options.backupPhone] - Backup phone for recovery.
   * @returns {Promise<object>} - 2FA setup details (secret, backup codes, QR code URL).
   */
  async configure2FA(merchantId, branchId, { preferredMethod, backupEmail, backupPhone }) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const secret = speakeasy.generateSecret({ 
        length: 20, 
        name: `MunchMtxi:${merchantId}`, 
        issuer: 'MunchMtxi' 
      });

      let merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
      if (!merchant2FA) {
        merchant2FA = await Merchant2FA.create({
          merchant_id: merchantId,
          is_enabled: false,
          preferred_method: preferredMethod || 'authenticator',
          secret_key: secret.base32,
          backup_email: backupEmail,
          backup_phone: backupPhone,
        });
      } else {
        await merchant2FA.update({
          preferred_method: preferredMethod || merchant2FA.preferred_method,
          secret_key: secret.base32,
          backup_email: backupEmail || merchant2FA.backup_email,
          backup_phone: backupPhone || merchant2FA.backup_phone,
        });
        // Clear existing backup codes if reconfiguring
        await Merchant2FABackupCode.destroy({ where: { merchant_2fa_id: merchant2FA.id } });
      }

      // Generate 10 backup codes with all required fields
      const now = new Date();
      const backupCodes = Array(10).fill().map(() => ({
        merchant_2fa_id: merchant2FA.id,
        code: speakeasy.generateSecret({ length: 8 }).base32.slice(0, 10),
        is_used: false,
        created_at: now,
        used_at: null,
      }));
      await Merchant2FABackupCode.bulkCreate(backupCodes, {
        fields: ['merchant_2fa_id', 'code', 'is_used', 'created_at', 'used_at']
      });

      logSecurityEvent('2FA configured for branch profile', { merchantId, branchId });
      return {
        secret: secret.base32,
        backupCodes: backupCodes.map(b => b.code), // Return just codes
        qrCodeUrl: secret.otpauth_url,
      };
    } catch (error) {
      logger.error('Error configuring 2FA', { merchantId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to configure 2FA', 500, '2FA_CONFIG_FAILURE');
    }
  },

  /**
   * Enable 2FA after verifying a code.
   * @param {number} merchantId - The ID of the merchant.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @param {string} twoFactorCode - The 2FA code to verify.
   * @returns {Promise<object>} - Success confirmation.
   */
  async enable2FA(merchantId, branchId, twoFactorCode) {
    try {
      const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
      if (!merchant2FA || !merchant2FA.secret_key) {
        throw new AppError('2FA not configured', 400, '2FA_NOT_CONFIGURED');
      }

      const isValid = speakeasy.totp.verify({
        secret: merchant2FA.secret_key,
        encoding: 'base32',
        token: twoFactorCode,
      });
      if (!isValid) {
        logger.warn('Invalid 2FA code', { merchantId });
        throw new AppError('Invalid 2FA code', 401, '2FA_INVALID');
      }

      await merchant2FA.update({ is_enabled: true, last_verified: new Date() });
      logSecurityEvent('2FA enabled for branch profile', { merchantId, branchId });
      return { success: true, message: '2FA enabled successfully' };
    } catch (error) {
      logger.error('Error enabling 2FA', { merchantId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to enable 2FA', 500, '2FA_ENABLE_FAILURE');
    }
  },

  /**
   * Verify a 2FA code or backup code for authentication.
   * @param {number} merchantId - The ID of the merchant.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @param {string} [twoFactorCode] - The 2FA code (optional if using backup code).
   * @param {string} [backupCode] - The backup code (optional if using 2FA code).
   * @returns {Promise<object>} - Verification result.
   */
  async verify2FA(merchantId, branchId, { twoFactorCode, backupCode }) {
    try {
      const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
      if (!merchant2FA || !merchant2FA.is_enabled) {
        return { success: true, message: '2FA not required' };
      }

      if (!twoFactorCode && !backupCode) {
        throw new AppError('2FA code or backup code required', 403, '2FA_REQUIRED');
      }

      if (twoFactorCode) {
        const isValid = speakeasy.totp.verify({
          secret: merchant2FA.secret_key,
          encoding: 'base32',
          token: twoFactorCode,
        });
        if (!isValid) {
          logger.warn('Invalid 2FA code', { merchantId });
          throw new AppError('Invalid 2FA code', 401, '2FA_INVALID');
        }
        await merchant2FA.update({ last_verified: new Date() });
        logSecurityEvent('2FA verified', { merchantId, branchId });
        return { success: true, message: '2FA verified' };
      }

      if (backupCode) {
        const backup = await Merchant2FABackupCode.findOne({
          where: { merchant_2fa_id: merchant2FA.id, code: backupCode, is_used: false },
        });
        if (!backup) {
          logger.warn('Invalid or used backup code', { merchantId });
          throw new AppError('Invalid or used backup code', 401, 'BACKUP_CODE_INVALID');
        }
        await backup.update({ is_used: true, used_at: new Date() });
        logSecurityEvent('Backup code used', { merchantId, branchId, backupCodeId: backup.id });
        return { success: true, message: 'Backup code verified' };
      }
    } catch (error) {
      logger.error('Error verifying 2FA', { merchantId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to verify 2FA', 500, '2FA_VERIFY_FAILURE');
    }
  },

  /**
   * Disable 2FA for a merchant.
   * @param {number} merchantId - The ID of the merchant.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @returns {Promise<object>} - Success confirmation.
   */
  async disable2FA(merchantId, branchId) {
    try {
      const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
      if (!merchant2FA) {
        throw new AppError('2FA not configured', 400, '2FA_NOT_CONFIGURED');
      }

      await merchant2FA.update({ is_enabled: false });
      logSecurityEvent('2FA disabled for branch profile', { merchantId, branchId });
      return { success: true, message: '2FA disabled successfully' };
    } catch (error) {
      logger.error('Error disabling 2FA', { merchantId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to disable 2FA', 500, '2FA_DISABLE_FAILURE');
    }
  },

  /**
   * Regenerate backup codes for a merchant.
   * @param {number} merchantId - The ID of the merchant.
   * @param {number} branchId - The ID of the branch (for logging/context).
   * @returns {Promise<string[]>} - New backup codes.
   */
  async regenerateBackupCodes(merchantId, branchId) {
    try {
      const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
      if (!merchant2FA) {
        throw new AppError('2FA not configured', 400, '2FA_NOT_CONFIGURED');
      }

      await Merchant2FABackupCode.destroy({ where: { merchant_2fa_id: merchant2FA.id } });
      const backupCodes = Array(10).fill().map(() => 
        speakeasy.generateSecret({ length: 8 }).base32.slice(0, 10)
      );
      await Merchant2FABackupCode.bulkCreate(
        backupCodes.map(code => ({
          merchant_2fa_id: merchant2FA.id,
          code,
        })),
        {
          fields: ['merchant_2fa_id', 'code', 'is_used', 'created_at', 'used_at']
        }
      );

      logSecurityEvent('Backup codes regenerated', { merchantId, branchId });
      return backupCodes;
    } catch (error) {
      logger.error('Error regenerating backup codes', { merchantId, branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to regenerate backup codes', 500, 'BACKUP_CODE_REGEN_FAILURE');
    }
  },
};

module.exports = branchProfileSecurityService;
