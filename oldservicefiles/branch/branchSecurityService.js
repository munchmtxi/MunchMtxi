// src/services/merchantServices/branchProfileServices/branchSecurityService.js

const { MerchantBranch, BranchActivity } = require('@models');
const { TokenService } = require('@services/tokenService');
const { EventManager } = require('@services/eventManager');
const { RiskAssessmentService } = require('@services/riskAssessmentService');
const { SecurityAuditLogger } = require('@services/securityAuditLogger');
const { TransactionLogger } = require('@services/transactionLogger');
const AppError = require('@utils/AppError');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class BranchSecurityService {
  constructor() {
    this.tokenService = new TokenService();
    this.riskAssessment = new RiskAssessmentService();
    this.auditLogger = new SecurityAuditLogger();
    this.transactionLogger = new TransactionLogger();
  }

  async updatePassword(branchId, currentPassword, newPassword) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    // Verify current password
    const isPasswordValid = await this.tokenService.verifyPassword(
      currentPassword,
      branch.password
    );

    if (!isPasswordValid) {
      await this.handleFailedPasswordAttempt(branch);
      throw new AppError('Current password is incorrect', 401);
    }

    // Check password history to prevent reuse
    const isPasswordReused = await this.checkPasswordHistory(branchId, newPassword);
    if (isPasswordReused) {
      throw new AppError('Password has been used recently', 400);
    }

    // Hash and update new password
    const hashedPassword = await this.tokenService.hashPassword(newPassword);
    
    await branch.update({
      password: hashedPassword,
      last_password_update: new Date(),
      login_attempts: 0
    });

    // Log the password update
    await this.auditLogger.log({
      entityType: 'branch',
      entityId: branchId,
      action: 'password_update',
      status: 'success'
    });

    // Emit event for real-time notifications
    EventManager.emit('branch.security.password_updated', {
      branchId,
      timestamp: new Date()
    });
  }

  async configureTwoFactor(branchId, enable) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    if (enable) {
      // Generate new 2FA secret
      const secret = speakeasy.generateSecret({
        name: `MunchMtxi-Branch-${branch.branch_code}`
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret temporarily (will be confirmed after verification)
      await branch.update({
        two_factor_secret: secret.base32,
        two_factor_enabled: false // Will be enabled after verification
      });

      return {
        secret: secret.base32,
        qrCode
      };
    } else {
      // Disable 2FA
      await branch.update({
        two_factor_secret: null,
        two_factor_enabled: false
      });

      await this.auditLogger.log({
        entityType: 'branch',
        entityId: branchId,
        action: '2fa_disabled',
        status: 'success'
      });

      EventManager.emit('branch.security.2fa_disabled', {
        branchId,
        timestamp: new Date()
      });

      return { message: '2FA disabled successfully' };
    }
  }

  async verifyTwoFactor(branchId, token) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || !branch.two_factor_secret) {
      throw new AppError('Invalid branch or 2FA not configured', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: branch.two_factor_secret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      throw new AppError('Invalid 2FA token', 401);
    }

    // Enable 2FA after successful verification
    await branch.update({
      two_factor_enabled: true
    });

    await this.auditLogger.log({
      entityType: 'branch',
      entityId: branchId,
      action: '2fa_enabled',
      status: 'success'
    });

    EventManager.emit('branch.security.2fa_enabled', {
      branchId,
      timestamp: new Date()
    });
  }

  async getLoginActivity(branchId, { page = 1, limit = 10 }) {
    const activities = await BranchActivity.findAndCountAll({
      where: {
        branch_id: branchId,
        activity_type: 'login'
      },
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    return {
      activities: activities.rows,
      pagination: {
        total: activities.count,
        pages: Math.ceil(activities.count / limit),
        current: page,
        perPage: limit
      }
    };
  }

  async manageTrustedDevice(branchId, deviceId, action) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    let trustedDevices = branch.trusted_devices || [];

    if (action === 'add') {
      if (!trustedDevices.includes(deviceId)) {
        trustedDevices.push(deviceId);
      }
    } else if (action === 'remove') {
      trustedDevices = trustedDevices.filter(id => id !== deviceId);
    }

    await branch.u