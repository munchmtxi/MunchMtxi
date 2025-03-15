// src/controllers/merchant/profile/profileAnalyticsController.js
'use strict';
const profileAnalyticsService = require('@services/merchant/profile/profileAnalyticsService');
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

class ProfileAnalyticsController {
  // Get analytics summary for a merchant
  getAnalyticsSummary = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const { period } = req.query;

    logger.info('Fetching analytics summary', { merchantId, period });
    const summary = await profileAnalyticsService.getAnalyticsSummary(merchantId, period);

    res.status(200).json({
      status: 'success',
      data: summary
    });
  });

  // Get active viewers for a merchant
  getActiveViewers = catchAsync(async (req, res) => {
    const { merchantId } = req.params;

    logger.info('Fetching active viewers', { merchantId });
    const viewers = await profileAnalyticsService.getActiveViewers(merchantId);

    res.status(200).json({
      status: 'success',
      data: viewers
    });
  });

  // Get detailed analytics for a merchant
  getDetailedAnalytics = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      viewType: req.query.viewType,
      source: req.query.source,
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    };

    logger.info('Fetching detailed analytics', { merchantId, filters });
    const analytics = await profileAnalyticsService.getDetailedAnalytics(merchantId, filters);

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  });

  // Middleware to verify merchant ownership
  verifyMerchantOwnership = catchAsync(async (req, res, next) => {
    const { merchantId } = req.params;
    const userId = req.user.id;

    const merchant = await Merchant.findOne({
      where: { id: merchantId, user_id: userId }
    });

    if (!merchant) {
      logger.warn('Unauthorized analytics access attempt', { userId, merchantId });
      throw new AppError('Unauthorized to access this merchant’s analytics', 403, 'UNAUTHORIZED');
    }

    next();
  });
}

module.exports = new ProfileAnalyticsController();