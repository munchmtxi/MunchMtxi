// @services/merchantServices/profileServices/merchant2FAService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const { Merchant2FA, Merchant2FABackupCode, Device } = require('@models');
const notificationService = require('@services/notificationService');
const securityAuditLogger = require('@services/securityAuditLogger');
const eventManager = require('@services/eventManager');
const riskAssessmentService = require('@services/riskAssessmentService');

class Merchant2FAService {
  async setup2FA(merchantId, method = 'authenticator') {
    // Check if 2FA already exists for this merchant
    const existing2FA = await Merchant2FA.findOne({
      where: { merchant_id: merchantId }
    });

    if (existing2FA && existing2FA.is_enabled) {
      throw new AppError('2FA is already set up for this merchant', 400);
    }

    let setupData = {};
    
    // Setup based on selected method
    switch (method) {
      case 'authenticator':
        setupData = await this.setupAuthenticator(merchantId);
        break;
      case 'sms':
        // Setup SMS verification method
        setupData = await this._setupSMSMethod(merchantId);
        break;
      case 'email':
        // Setup Email verification method
        setupData = await this._setupEmailMethod(merchantId);
        break;
      default:
        throw new AppError('Invalid 2FA method', 400);
    }

    // Log the 2FA setup attempt
    await securityAuditLogger.log({
      userId: merchantId,
      action: '2FA_SETUP_INITIATED',
      details: { method }
    });

    // Emit event for 2FA setup initiation
    eventManager.emit('merchant.2fa.setup_initiated', { 
      merchantId, 
      method,
      timestamp: new Date()
    });

    return {
      method,
      ...setupData,
      isSetup: true,
      nextStep: 'verification'
    };
  }

  async setupAuthenticator(merchantId) {
    const secret = speakeasy.generateSecret({
      name: `MunchMtxi-${merchantId}`
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: {
        secret_key: secret.base32,
        preferred_method: 'authenticator'
      }
    });

    return {
      secret: secret.base32,
      qrCode,
      merchant2FAId: merchant2FA.id
    };
  }

  // Private method to setup SMS verification
  async _setupSMSMethod(merchantId) {
    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: {
        preferred_method: 'sms'
      }
    });

    // Generate a verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code temporarily (e.g., with an expiration)
    await merchant2FA.update({
      temp_secret: verificationCode,
      temp_secret_expires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
    });

    // Here you would normally send the SMS, but for now we'll just return the code
    // This should be handled by your notification service in production
    return {
      merchant2FAId: merchant2FA.id,
      codeSent: true,
      // Don't return the actual code in production!
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    };
  }

  // Private method to setup Email verification
  async _setupEmailMethod(merchantId) {
    const [merchant2FA] = await Merchant2FA.findOrCreate({
      where: { merchant_id: merchantId },
      defaults: {
        preferred_method: 'email'
      }
    });

    // Generate a verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code temporarily (e.g., with an expiration)
    await merchant2FA.update({
      temp_secret: verificationCode,
      temp_secret_expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
    });

    // Here you would normally send the email, but for now we'll just return the code
    // This should be handled by your notification service in production
    return {
      merchant2FAId: merchant2FA.id,
      codeSent: true,
      // Don't return the actual code in production!
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    };
  }

  async enable2FA(merchantId, token, method = 'authenticator') {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    
    if (merchant2FA.is_enabled) {
      throw new AppError('2FA is already enabled', 400);
    }

    // Verify token based on method
    await this._verifyToken(merchant2FA, token, method);

    // Generate backup codes
    const backupCodes = await this._generateBackupCodes(merchant2FA.id);

    // Enable 2FA
    await merchant2FA.update({
      is_enabled: true,
      preferred_method: method,
      last_verified: new Date()
    });

    // Log the event
    await securityAuditLogger.log({
      userId: merchantId,
      action: '2FA_ENABLED',
      details: { method }
    });

    // Emit event
    eventManager.emit('merchant.2fa.enabled', { merchantId, method });

    return {
      success: true,
      backupCodes: backupCodes.map(bc => bc.code)
    };
  }

  async verify2FA(merchantId, token, method = null) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    
    if (!merchant2FA.is_enabled) {
      throw new AppError('2FA is not enabled', 400);
    }

    return this._verifyToken(
      merchant2FA, 
      token, 
      method || merchant2FA.preferred_method
    );
  }

  async disable2FA(merchantId, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    
    if (!merchant2FA.is_enabled) {
      throw new AppError('2FA is not enabled', 400);
    }

    // Verify token before disabling
    await this._verifyToken(merchant2FA, token);

    // Disable 2FA
    await merchant2FA.update({
      is_enabled: false,
      last_verified: null
    });

    // Invalidate all backup codes
    await Merchant2FABackupCode.update(
      { is_used: true },
      { where: { merchant_2fa_id: merchant2FA.id } }
    );

    // Log the event
    await securityAuditLogger.log({
      userId: merchantId,
      action: '2FA_DISABLED'
    });

    // Emit event
    eventManager.emit('merchant.2fa.disabled', { merchantId });

    return { success: true };
  }

  async updatePreferredMethod(merchantId, newMethod, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    
    // Verify current method before changing
    await this._verifyToken(merchant2FA, token);

    await merchant2FA.update({
      preferred_method: newMethod
    });

    return { success: true };
  }

  async generateNewBackupCodes(merchantId, token) {
    const merchant2FA = await this._getMerchant2FA(merchantId);
    
    // Verify token before generating new codes
    await this._verifyToken(merchant2FA, token);

    // Invalidate old codes
    await Merchant2FABackupCode.update(
      { is_used: true },
      { where: { merchant_2fa_id: merchant2FA.id } }
    );

    // Generate new codes
    const backupCodes = await this._generateBackupCodes(merchant2FA.id);

    return {
      success: true,
      backupCodes: backupCodes.map(bc => bc.code)
    };
  }

  async assessLoginRisk(merchantId, deviceId, ipAddress) {
    const riskScore = await riskAssessmentService.calculateLoginRiskScore({
      merchantId,
      deviceId,
      ipAddress
    });

    return riskScore >= 0.7; // Return true if high risk
  }

  // Private methods
  async _getMerchant2FA(merchantId) {
    const merchant2FA = await Merchant2FA.findOne({
      where: { merchant_id: merchantId }
    });

    if (!merchant2FA) {
      throw new AppError('2FA configuration not found', 404);
    }

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
      token: token,
      window: 1
    });

    if (!isValid) {
      throw new AppError('Invalid authentication code', 401);
    }

    await merchant2FA.update({ last_verified: new Date() });
    return true;
  }

  async _generateBackupCodes(merchant2FAId, count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        merchant_2fa_id: merchant2FAId,
        code: crypto.randomBytes(4).toString('hex').toUpperCase()
      });
    }

    return Merchant2FABackupCode.bulkCreate(codes);
  }
}

module.exports = new Merchant2FAService();