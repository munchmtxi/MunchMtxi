'use strict';
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const db = require('@models');
const { User, Merchant, PasswordHistory, PasswordResetLog } = db;
const securityAuditLogger = require('@services/common/securityAuditLogger');
const eventManager = require('@services/events/core/eventManager');
const passwordValidator = require('@validators/merchant/profile/passwordValidators');

class MerchantPasswordService {
  async changePassword(merchantId, body, clientIp) {
    console.log('--- Starting changePassword ---');
    console.log('Initial DB Check:', (await User.findByPk(merchantId, { attributes: ['password'] })).password);

    const { currentPassword, newPassword, passwordConfirmation } = body;
    console.log('Service Received:', body);
    console.log('Destructured:', { currentPassword, newPassword, passwordConfirmation });
    console.log('newPassword:', newPassword);
    console.log('passwordConfirmation:', passwordConfirmation);
    console.log('Types:', typeof newPassword, typeof passwordConfirmation);
    console.log('Comparison:', newPassword === passwordConfirmation);

    if (newPassword !== passwordConfirmation) {
      throw new AppError('New password and confirmation must match', 400);
    }

    const merchant = await Merchant.findOne({
      where: { user_id: merchantId },
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'password'] }],
    });
    console.log('After Merchant Fetch - User Password:', merchant?.user?.password);

    if (!merchant || !merchant.user) {
      throw new AppError('Merchant or associated user not found', 404);
    }
    const user = merchant.user;

    if (merchant.password_lock_until && merchant.password_lock_until > new Date()) {
      throw new AppError('Account is temporarily locked. Please try again later', 423);
    }

    console.log('Stored Hash Before Compare:', user.password);
    const isValid = await bcrypt.compare(currentPassword, user.password || '');
    console.log('Input Password:', currentPassword, 'Matches:', isValid);
    if (!isValid) {
      console.log('Password Check Failed - Current DB Hash:', (await User.findByPk(merchantId, { attributes: ['password'] })).password);
      await this._handleFailedPasswordAttempt(merchant);
      throw new AppError('Current password is incorrect', 401);
    }

    await this._validateNewPassword(newPassword, merchantId);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log('Generated New Password Hash:', passwordHash);
    const t = await db.sequelize.transaction();

    try {
      console.log('Transaction Started');
      await PasswordHistory.create({
        user_id: merchantId,
        user_type: 'merchant',
        password_hash: user.password,
      }, { transaction: t });
      console.log('PasswordHistory Created');

      await merchant.update({
        last_password_update: new Date(),
        password_strength: passwordValidator.calculateStrength(newPassword),
        failed_password_attempts: 0,
        password_lock_until: null,
      }, { transaction: t });
      console.log('Merchant Updated');

      console.log('Before User Update - Current Password:', user.password);
      await user.update({ password: passwordHash }, { transaction: t });
      console.log('After User Update - In-memory Password:', user.password);
      await user.reload({ transaction: t, attributes: ['id', 'email', 'password'] }); // Updated here
      console.log('After Reload - User Password:', user.password);

      await PasswordResetLog.create({
        user_id: merchantId,
        user_type: 'merchant',
        status: 'success',
        ip_address: clientIp,
      }, { transaction: t });
      console.log('PasswordResetLog Created');

      await t.commit();
      console.log('Transaction Committed');
      console.log('Post-Commit DB Check:', (await User.findByPk(merchantId, { attributes: ['password'] })).password);

      await Promise.all([
        securityAuditLogger.logSecurityAudit('PASSWORD_CHANGE', {
          userId: merchantId,
          userType: 'merchant',
          ip: clientIp,
        }),
        eventManager.emit('merchant.password.changed', { merchantId }),
      ]);

      return { success: true, message: 'Password successfully updated' };
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error('Transaction Rolled Back - Error:', error);
      throw error;
    }
  }

  async _validateNewPassword(password, merchantId) {
    await passwordValidator.validateNewPassword(password);
    const history = await PasswordHistory.findAll({
      where: { user_id: merchantId, user_type: 'merchant' },
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: { include: ['password_hash'] },
    });
    for (const record of history) {
      if (!record.password_hash) {
        console.error('Missing password_hash for record:', record.toJSON());
        continue;
      }
      const isMatch = await bcrypt.compare(password, record.password_hash);
      if (isMatch) {
        throw new AppError('New password cannot match a previously used password', 400);
      }
    }
  }

  async _handleFailedPasswordAttempt(merchant) {
    const attempts = (merchant.failed_password_attempts || 0) + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await merchant.update({
      failed_password_attempts: attempts,
      password_lock_until: lockUntil,
    });
    console.log('Failed Attempt Updated - Attempts:', attempts, 'Lock Until:', lockUntil);
  }

  async getPasswordHistory(merchantId) {
    try {
      const history = await PasswordHistory.findAll({
        where: { user_id: merchantId, user_type: 'merchant' },
        order: [['createdAt', 'DESC']],
      });
      return { success: true, data: history };
    } catch (error) {
      console.error('PasswordHistory Error:', error);
      throw error;
    }
  }

  async getPasswordStrength(merchantId) {
    const merchant = await Merchant.findOne({
      where: { user_id: merchantId },
      attributes: ['password_strength'],
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }
    return { success: true, strength: merchant.password_strength };
  }
}

module.exports = new MerchantPasswordService();