// src/services/merchant/profile/merchant2FAService.js
'use strict';
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const { Merchant2FA, Merchant2FABackupCode } = require('@models');
const securityAuditLogger = require('@services/common/securityAuditLogger');
const { logger } = require('@utils/logger');

class Merchant2FAService {
  async setup2FA(merchantId, method = 'authenticator') {
    logger.debug('Setup 2FA called with', { merchantId, method }); // Add debug log
    const existing2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
    if (existing2FA && existing2FA.is_enabled) {
      throw new AppError('2FA is already set up for this merchant', 400);
    }

    let setupData = {};
    switch (method) {
      case 'authenticator':
        setupData = await this.setupAuthenticator(merchantId);
        break;
      case 'sms':
        setupData = await this._setupSMSMethod(merchantId);
        break;
      case 'email':
        setupData = await this._setupEmailMethod(merchantId);
        break;
      default:
        throw new AppError('Invalid 2FA method', 400);
    }

    logger.debug('2FA setup data prepared', { merchantId, method, setupData }); // Add debug log
    await securityAuditLogger.logSecurityAudit('2FA_SETUP_INITIATED', { userId: merchantId, method });

    return { method, ...setupData, isSetup: true, nextStep: 'verification' };
  }

  async setupAuthenticator(merchantId) {
    const secret = speakeasy.generateSecret({ name: `MunchMtxi-${merchantId}` });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    logger.debug('Creating Merchant2FA with', { merchantId, secret: secret.base32 }); // Add debug log
    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: { secret_key: secret.base32, preferred_method: 'authenticator' },
    });
    return { secret: secret.base32, qrCode, merchant2FAId: merchant2FA.id };
  }

  async _setupSMSMethod(merchantId) {
    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: { preferred_method: 'sms' },
    });
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await merchant2FA.update({
      temp_secret: verificationCode,
      temp_secret_expires: new Date(Date.now() + 10 * 60 * 1000),
    });
    return {
      merchant2FAId: merchant2FA.id,
      codeSent: true,
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
    };
  }

  async _setupEmailMethod(merchantId) {
    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: { preferred_method: 'email' },
    });
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await merchant2FA.update({
      temp_secret: verificationCode,
      temp_secret_expires: new Date(Date.now() + 15 * 60 * 1000),
    });
    return {
      merchant2FAId: merchant2FA.id,
      codeSent: true,
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
    };
  }

  async enable2FA(merchantId, token, method = 'authenticator') {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    if (merchant2FA.is_enabled) throw new AppError('2FA is already enabled', 400);
    await this._verifyToken(merchant2FA, token, method);
    const backupCodes = await this._generateBackupCodes(merchant2FA.id);
    await merchant2FA.update({ is_enabled: true, preferred_method: method, last_verified: new Date() });
    await securityAuditLogger.logSecurityAudit('2FA_ENABLED', { userId: merchantId, method });
    return { success: true, backupCodes: backupCodes.map(bc => bc.code) };
  }

  async verify2FA(merchantId, token, method = null) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    if (!merchant2FA.is_enabled) throw new AppError('2FA is not enabled', 400);
    return this._verifyToken(merchant2FA, token, method || merchant2FA.preferred_method);
  }

  async disable2FA(merchantId, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    if (!merchant2FA.is_enabled) throw new AppError('2FA is not enabled', 400);
    await this._verifyToken(merchant2FA, token);
    await merchant2FA.update({ is_enabled: false, last_verified: null });
    await Merchant2FABackupCode.update({ is_used: true }, { where: { merchant_2fa_id: merchant2FA.id } });
    await securityAuditLogger.logSecurityAudit('2FA_DISABLED', { userId: merchantId });
    return { success: true };
  }

  async updatePreferredMethod(merchantId, newMethod, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    await this._verifyToken(merchant2FA, token);
    await merchant2FA.update({ preferred_method: newMethod });
    return { success: true };
  }

  async generateNewBackupCodes(merchantId, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    await this._verifyToken(merchant2FA, token);
    await Merchant2FABackupCode.update({ is_used: true }, { where: { merchant_2fa_id: merchant2FA.id } });
    const backupCodes = await this._generateBackupCodes(merchant2FA.id);
    return { success: true, backupCodes: backupCodes.map(bc => bc.code) };
  }

  async _getMerchant2FA(merchantId) {
    const merchant2FA = await Merchant2FA.findOne({ where: { merchant_id: merchantId } });
    if (!merchant2FA) throw new AppError('2FA configuration not found', 404);
    return merchant2FA;
  }

  async _verifyToken(merchant2FA, token, method = null) {
    method = method || merchant2FA.preferred_method;
    switch (method) {
      case 'authenticator':
        return this._verifyAuthenticator(merchant2FA, token);
      case 'sms':
        return this._verifySMS(merchant2FA, token);
      case 'email':
        return this._verifyEmail(merchant2FA, token);
      case 'backup':
        return this._verifyBackupCode(merchant2FA, token);
      default:
        throw new AppError('Invalid 2FA method', 400);
    }
  }

  async _verifyAuthenticator(merchant2FA, token) {
    const isValid = speakeasy.totp.verify({
      secret: merchant2FA.secret_key,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!isValid) throw new AppError('Invalid authentication code', 401);
    await merchant2FA.update({ last_verified: new Date() });
    return true;
  }

  async _verifySMS(merchant2FA, token) {
    if (!merchant2FA.temp_secret || merchant2FA.temp_secret_expires < new Date()) {
      throw new AppError('Verification code expired or invalid', 401);
    }
    if (merchant2FA.temp_secret !== token) throw new AppError('Invalid SMS code', 401);
    await merchant2FA.update({ temp_secret: null, temp_secret_expires: null, last_verified: new Date() });
    return true;
  }

  async _verifyEmail(merchant2FA, token) {
    if (!merchant2FA.temp_secret || merchant2FA.temp_secret_expires < new Date()) {
      throw new AppError('Verification code expired or invalid', 401);
    }
    if (merchant2FA.temp_secret !== token) throw new AppError('Invalid email code', 401);
    await merchant2FA.update({ temp_secret: null, temp_secret_expires: null, last_verified: new Date() });
    return true;
  }

  async _verifyBackupCode(merchant2FA, token) {
    const backupCode = await Merchant2FABackupCode.findOne({
      where: { merchant_2fa_id: merchant2FA.id, code: token, is_used: false },
    });
    if (!backupCode) throw new AppError('Invalid or used backup code', 401);
    await backupCode.update({ is_used: true, used_at: new Date() });
    await merchant2FA.update({ last_verified: new Date() });
    return true;
  }

  async _generateBackupCodes(merchant2FAId, count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push({ merchant_2fa_id: merchant2FAId, code: crypto.randomBytes(4).toString('hex').toUpperCase() });
    }
    return Merchant2FABackupCode.bulkCreate(codes);
  }
}

module.exports = new Merchant2FAService();