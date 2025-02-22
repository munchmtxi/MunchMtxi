// src/services/merchantServices/profileServices/previewService.js
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const securityAuditLogger = require('@services/securityAuditLogger');
const TokenService = require('@services/tokenService');

class PreviewService {
  constructor() {
    this.previewSessions = new Map();
  }

  async startPreview(merchantId, userId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const previewSession = {
      originalData: merchant.toJSON(),
      previewData: merchant.toJSON(),
      startedAt: new Date(),
      userId
    };

    this.previewSessions.set(merchantId, previewSession);
    
    await securityAuditLogger.logSecurityAudit('MERCHANT_PREVIEW_START', {
      userId,
      merchantId,
      severity: 'info'
    });

    return previewSession.previewData;
  }

  async updatePreview(merchantId, userId, updates) {
    const session = this.previewSessions.get(merchantId);
    if (!session) {
      throw new AppError('No active preview session', 404, 'NO_PREVIEW_SESSION');
    }

    if (session.userId !== userId) {
      throw new AppError('Unauthorized preview access', 403, 'UNAUTHORIZED_PREVIEW');
    }

    // Merge updates with current preview data
    session.previewData = {
      ...session.previewData,
      ...updates
    };

    this.previewSessions.set(merchantId, session);
    return session.previewData;
  }

  async endPreview(merchantId, userId) {
    const session = this.previewSessions.get(merchantId);
    if (!session) {
      return null;
    }

    if (session.userId !== userId) {
      throw new AppError('Unauthorized preview access', 403, 'UNAUTHORIZED_PREVIEW');
    }

    this.previewSessions.delete(merchantId);
    
    await securityAuditLogger.logSecurityAudit('MERCHANT_PREVIEW_END', {
      userId,
      merchantId,
      severity: 'info'
    });

    return session;
  }

  getPreviewSession(merchantId) {
    return this.previewSessions.get(merchantId);
  }
}

module.exports = new PreviewService();