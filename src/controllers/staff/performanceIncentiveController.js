'use strict';

const catchAsync = require('@utils/catchAsync');
const PerformanceIncentiveService = require('@services/staff/performanceIncentiveService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const performanceIncentiveController = {
  // Calculate rewards for a staff member
  calculateRewards: catchAsync(async (req, res) => {
    const { staffId } = req.params;
    const performanceService = new PerformanceIncentiveService(req.io);
    performanceService.setNotificationService(req.app.locals.notificationService);

    const points = await performanceService.calculateRewards(staffId);

    logger.info('Rewards calculated', { staffId, points });
    res.status(200).json({
      status: 'success',
      message: 'Rewards calculated successfully',
      data: { staffId, points },
    });
  }),

  // Assign a tier to a staff member
  assignTier: catchAsync(async (req, res) => {
    const { staffId } = req.params;
    const performanceService = new PerformanceIncentiveService(req.io);
    performanceService.setNotificationService(req.app.locals.notificationService);

    const tier = await performanceService.assignTier(staffId);

    logger.info('Tier assigned', { staffId, tier });
    res.status(200).json({
      status: 'success',
      message: 'Tier assigned successfully',
      data: { staffId, tier },
    });
  }),

  // Redeem rewards for a staff member
  redeemRewards: catchAsync(async (req, res) => {
    const { staffId } = req.params;
    const { rewardType, pointsToRedeem } = req.body;
    const performanceService = new PerformanceIncentiveService(req.io);
    performanceService.setNotificationService(req.app.locals.notificationService);

    const redemption = await performanceService.redeemRewards(staffId, rewardType, pointsToRedeem);

    logger.info('Rewards redeemed', { staffId, rewardType, pointsToRedeem });
    res.status(200).json({
      status: 'success',
      message: 'Rewards redeemed successfully',
      data: redemption,
    });
  }),

  // Get performance metrics for a staff member
  getPerformanceMetrics: catchAsync(async (req, res) => {
    const { staffId } = req.params;
    const performanceService = new PerformanceIncentiveService(req.io);

    const metrics = await performanceService.getPerformanceMetrics(staffId);

    logger.info('Performance metrics fetched', { staffId });
    res.status(200).json({
      status: 'success',
      message: 'Performance metrics fetched successfully',
      data: metrics,
    });
  }),
};

module.exports = performanceIncentiveController;