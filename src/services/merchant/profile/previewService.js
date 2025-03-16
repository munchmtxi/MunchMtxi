const { Merchant } = require('@models');
const { logger, logSecurityEvent } = require('@utils/logger'); // Add logSecurityEvent
const AppError = require('@utils/AppError');
const TokenService = require('@services/common/tokenService');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

class PreviewService {
  async startPreview(merchantId, userId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }
    if (merchant.user_id !== userId) {
      throw new AppError('Unauthorized to preview this merchant', 403, 'UNAUTHORIZED_PREVIEW');
    }

    const previewSession = {
      originalData: merchant.toJSON(),
      previewData: merchant.toJSON(),
      startedAt: new Date(),
      userId,
    };

    const sessionKey = `preview:${merchantId}`;
    await redis.setex(sessionKey, 3600, JSON.stringify(previewSession)); // 1-hour TTL

    logSecurityEvent('MERCHANT_PREVIEW_START', { // Use standalone function
      userId,
      merchantId,
      type: 'security',
    });

    return previewSession.previewData;
  }

  async updatePreview(merchantId, userId, updates) {
    const sessionKey = `preview:${merchantId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      throw new AppError('No active preview session', 404, 'NO_PREVIEW_SESSION');
    }

    const session = JSON.parse(sessionData);
    if (session.userId !== userId) {
      throw new AppError('Unauthorized preview access', 403, 'UNAUTHORIZED_PREVIEW');
    }

    session.previewData = { ...session.previewData, ...updates };
    await redis.setex(sessionKey, 3600, JSON.stringify(session)); // Refresh TTL

    return session.previewData;
  }

  async endPreview(merchantId, userId) {
    const sessionKey = `preview:${merchantId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    if (session.userId !== userId) {
      throw new AppError('Unauthorized preview access', 403, 'UNAUTHORIZED_PREVIEW');
    }

    await redis.del(sessionKey);
    logSecurityEvent('MERCHANT_PREVIEW_END', { // Use standalone function
      userId,
      merchantId,
      type: 'security',
    });

    return session;
  }

  async getPreviewSession(merchantId) {
    const sessionKey = `preview:${merchantId}`;
    const sessionData = await redis.get(sessionKey);
    return sessionData ? JSON.parse(sessionData) : null;
  }
}

module.exports = new PreviewService();