// @services/merchantServices/profileServices/merchantPasswordService.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const { Merchant, PasswordHistory, PasswordResetLog } = require('@models');
const notificationService = require('@services/notificationService');
const securityAuditLogger = require('@services/securityAuditLogger');
const eventManager = require('@services/eventManager');
const passwordValidator = require('@validators/merchantValidators/profileValidators/passwordValidator');

class MerchantPasswordService {
  async changePassword(merchantId, { currentPassword, newPassword }, clientIp) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    // Check if account is locked
    if (merchant.password_lock_until && merchant.password_lock_until > new Date()) {
      throw new AppError('Account is temporarily locked. Please try again later', 423);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, merchant.password_hash);
    if (!isValid) {
      await this._handleFailedPasswordAttempt(merchant);
      throw new AppError('Current password is incorrect', 401);
    }

    // Validate new password strength and history
    await this._validateNewPassword(newPassword, merchantId);
    
    // Generate new hash
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Start transaction
    const t = await sequelize.transaction();
    
    try {
      // Store in password history
      await PasswordHistory.create({
        user_id: merchantId,
        password_hash: passwordHash,
        user_type: 'merchant'
      }, { transaction: t });

      // Update merchant password
      await merchant.update({
        password_hash: passwordHash,
        last_password_update: new Date(),
        password_strength: passwordValidator.calculateStrength(newPassword),
        failed_password_attempts: 0,
        password_lock_until: null
      }, { transaction: t });

      // Log the successful password change
      await PasswordResetLog.create({
        user_id: merchantId,
        status: 'success',
        ip_address: clientIp,
        user_type: 'merchant'
      }, { transaction: t });

      await t.commit();

      // Send notification
      await notificationService.sendPasswordChangeNotification(merchant.email);
      
      // Log security audit
      await securityAuditLogger.log({
        userId: merchantId,
        userType: 'merchant',
        action: 'PASSWORD_CHANGE',
        ip: clientIp
      });

      // Emit event
      eventManager.emit('merchant.password.changed', { merchantId });

      return { success: true, message: 'Password successfully updated' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async _validateNewPassword(password, merchantId) {
    // Validate password complexity
    const validationResult = passwordValidator.validate(password);
    if (!validationResult.isValid) {
      throw new AppError(validationResult.errors.join(', '), 400);
    }

    // Check password history (last 5 passwords or 90 days)
    const recentPasswords = await PasswordHistory.findAll({
      where: {
        user_id: merchantId,
        user_type: 'merchant',
        created_at: {
          [Op.gte]: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))
        }
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    for (const historicPassword of recentPasswords) {
      const matches = await bcrypt.compare(password, historicPassword.password_hash);
      if (matches) {
        throw new AppError('Password has been used recently. Please choose a different password.', 400);
      }
    }
  }

  async _handleFailedPasswordAttempt(merchant) {
    const failedAttempts = merchant.failed_password_attempts + 1;
    const updates = { failed_password_attempts: failedAttempts };

    if (failedAttempts >= 5) {
      updates.password_lock_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      // Notify merchant about account lock
      await notificationService.sendAccountLockNotification(merchant.email);
    }

    await merchant.update(updates);
  }

  async getPasswordHistory(merchantId) {
    return PasswordResetLog.findAll({
      where: {
        user_id: merchantId,
        user_type: 'merchant'
      },
      order: [['created_at', 'DESC']],
      limit: 10
    });
  }

  async getPasswordStrength(merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    return {
      strength: merchant.password_strength,
      lastUpdate: merchant.last_password_update,
      recommendations: passwordValidator.getStrengthRecommendations(merchant.password_strength)
    };
  }
}

module.exports = new MerchantPasswordService();