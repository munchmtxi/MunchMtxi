'use strict';

const { Op } = require('sequelize');
const { 
  Staff, 
  User, 
  Order, 
  InDiningOrder, 
  Table, 
  Notification, 
  Payment, 
  Booking,
  Feedback
} = require('@models');
const OrderService = require('@services/customer/orderService');
const InDiningOrderService = require('@services/customer/inDiningOrderService');
const QuickLinkService = require('@services/customer/quickLinkService');
const AppError = require('@utils/AppError');
const { logger, PerformanceMonitor } = require('@utils/logger');

class PerformanceIncentiveService {
  constructor(io) {
    this.io = io;
    this.notificationService = null; // To be set via setNotificationService
    this.orderService = OrderService; // Static import like OrderService.js
    this.inDiningOrderService = new InDiningOrderService(io); // Instance with io like InDiningOrderService
    this.quickLinkService = new QuickLinkService(); // Instance like QuickLinkService
    this.performanceMonitor = PerformanceMonitor;
    this.tiers = {
      BRONZE: { minPoints: 0, maxPoints: 499, label: 'Bronze' },
      SILVER: { minPoints: 500, maxPoints: 999, label: 'Silver' },
      GOLD: { minPoints: 1000, maxPoints: Infinity, label: 'Gold' },
    };
    this.pointValues = {
      orderCompleted: 10,
      inDiningOrderClosed: 8,
      tableTurnover: 5,
      quickCheckIn: 3,
      positiveFeedback: 15,
      tipReceived: 1,
      bookingHandled: 5,
      staffRequestFulfilled: 3,
    };
  }

  /**
   * Set the notification service instance
   * @param {Object} notificationService - The notification service instance
   */
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Calculate performance rewards for a staff member
   * @param {number} staffId - The user_id of the staff member from the Users table
   * @returns {Promise<number>} - Points earned
   */
  async calculateRewards(staffId) {
    const perf = this.performanceMonitor.start('calculateRewards');
    try {
      const staff = await Staff.findOne({
        where: { user_id: staffId, deleted_at: null },
        include: [{ model: User, as: 'user' }],
      });
      if (!staff) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId });
      }

      const metrics = await this.getPerformanceMetrics(staffId);
      const points = this.calculatePoints(metrics);

      staff.performance_metrics = staff.performance_metrics || { 
        points: 0, 
        tier: 'Bronze', 
        lastEvaluated: null, 
        redemption_history: [] 
      };
      staff.performance_metrics.points = (staff.performance_metrics.points || 0) + points;
      staff.performance_metrics.lastEvaluated = new Date();

      const newTier = this.determineTier(staff.performance_metrics.points);
      if (staff.performance_metrics.tier !== newTier.label) {
        staff.performance_metrics.tier = newTier.label;
        await this.notifyTierChange(staff, newTier);
      }

      await staff.save();
      logger.info('Rewards calculated for staff', { staffId: staff.id, points, newTier: newTier.label });

      await this.updateRealTimePerformance(staff);
      return points;
    } catch (error) {
      logger.error('Error calculating rewards', { error: error.message, staffId });
      throw error instanceof AppError ? error : new AppError('Failed to calculate rewards', 500, 'CALCULATION_FAILED', null, { staffId });
    } finally {
      perf.end();
    }
  }

  /**
   * Assign a performance tier to a staff member
   * @param {number} staffId - The user_id of the staff member from the Users table
   * @returns {Promise<string>} - Assigned tier label
   */
  async assignTier(staffId) {
    const perf = this.performanceMonitor.start('assignTier');
    try {
      const staff = await Staff.findOne({
        where: { user_id: staffId, deleted_at: null },
      });
      if (!staff) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId });
      }

      const points = staff.performance_metrics?.points || 0;
      const tier = this.determineTier(points);

      if (staff.performance_metrics?.tier !== tier.label) {
        staff.performance_metrics = staff.performance_metrics || {};
        staff.performance_metrics.tier = tier.label;
        staff.performance_metrics.lastEvaluated = new Date();
        await staff.save();
        await this.notifyTierChange(staff, tier);
        logger.info('Tier assigned to staff', { staffId: staff.id, tier: tier.label });
        await this.updateRealTimePerformance(staff);
      }

      return tier.label;
    } catch (error) {
      logger.error('Error assigning tier', { error: error.message, staffId });
      throw error instanceof AppError ? error : new AppError('Failed to assign tier', 500, 'TIER_ASSIGNMENT_FAILED', null, { staffId });
    } finally {
      perf.end();
    }
  }

  /**
   * Redeem rewards for a staff member
   * @param {number} staffId - The user_id of the staff member from the Users table
   * @param {string} rewardType - Type of reward ('gift_card', 'time_off', 'cash')
   * @param {number} pointsToRedeem - Points to redeem
   * @returns {Promise<Object>} - Redemption details
   */
  async redeemRewards(staffId, rewardType, pointsToRedeem) {
    const perf = this.performanceMonitor.start('redeemRewards');
    try {
      const validRewards = ['gift_card', 'time_off', 'cash'];
      if (!validRewards.includes(rewardType)) {
        throw new AppError('Invalid reward type', 400, 'INVALID_REWARD_TYPE', null, { rewardType });
      }

      const staff = await Staff.findOne({
        where: { user_id: staffId, deleted_at: null },
        include: [{ model: User, as: 'user' }],
      });
      if (!staff) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId });
      }

      const currentPoints = staff.performance_metrics?.points || 0;
      if (pointsToRedeem > currentPoints) {
        throw new AppError('Insufficient points for redemption', 400, 'INSUFFICIENT_POINTS', null, { pointsToRedeem, currentPoints });
      }

      const rewardValue = this.calculateRewardValue(rewardType, pointsToRedeem);
      staff.performance_metrics.points -= pointsToRedeem;
      staff.performance_metrics.redemption_history = staff.performance_metrics.redemption_history || [];
      staff.performance_metrics.redemption_history.push({
        type: rewardType,
        points: pointsToRedeem,
        value: rewardValue,
        date: new Date(),
      });

      await staff.save();
      await this.notifyRewardRedemption(staff, rewardType, pointsToRedeem, rewardValue);
      logger.info('Rewards redeemed', { staffId: staff.id, rewardType, pointsToRedeem, rewardValue });

      await this.updateRealTimePerformance(staff);
      return { rewardType, pointsRedeemed: pointsToRedeem, value: rewardValue };
    } catch (error) {
      logger.error('Error redeeming rewards', { error: error.message, staffId, rewardType });
      throw error instanceof AppError ? error : new AppError('Failed to redeem rewards', 500, 'REDEMPTION_FAILED', null, { staffId });
    } finally {
      perf.end();
    }
  }

  /**
   * Get performance metrics for a staff member
   * @param {number} staffId - The user_id of the staff member from the Users table
   * @returns {Promise<Object>} - Performance metrics
   */
  async getPerformanceMetrics(staffId) {
    const perf = this.performanceMonitor.start('getPerformanceMetrics');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const staff = await Staff.findOne({
        where: { user_id: staffId, deleted_at: null },
      });
      if (!staff) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId });
      }

      const [orders, inDiningOrders, tables, checkIns, feedback, tips, bookings, staffRequests] = await Promise.all([
        Order.count({
          where: { staff_id: staff.id, status: 'completed', updated_at: { [Op.gte]: thirtyDaysAgo } },
        }),
        InDiningOrder.count({
          where: { staff_id: staff.id, status: 'closed', updated_at: { [Op.gte]: thirtyDaysAgo } },
        }),
        Table.findAll({
          where: { assigned_staff_id: staff.id, status: 'available', updated_at: { [Op.gte]: thirtyDaysAgo } },
        }),
        this.quickLinkService.getCheckInCount ? this.quickLinkService.getCheckInCount(staff.id, thirtyDaysAgo) : 0,
        Feedback.count({
          where: {
            staff_id: staff.id,
            is_positive: true,
            created_at: { [Op.gte]: thirtyDaysAgo },
          },
        }),
        Payment.sum('tip_amount', {
          where: {
            staff_id: staff.id,
            status: 'completed', // Updated to match enum_payments_status
            created_at: { [Op.gte]: thirtyDaysAgo },
          },
        }),
        Booking.count({
          where: { staff_id: staff.id, status: { [Op.in]: ['approved', 'seated'] }, updated_at: { [Op.gte]: thirtyDaysAgo } },
        }),
        Notification.count({
          where: {
            user_id: staff.user_id,
            type: 'staff_request',
            read_status: true,
            created_at: { [Op.gte]: thirtyDaysAgo },
          },
        }),
      ]);

      return {
        completedOrders: orders,
        closedInDiningOrders: inDiningOrders,
        tableTurnovers: tables.length,
        quickCheckIns: checkIns,
        positiveFeedback: feedback,
        tipsReceived: tips || 0,
        bookingsHandled: bookings,
        staffRequestsFulfilled: staffRequests,
      };
    } catch (error) {
      logger.error('Error fetching performance metrics', { error: error.message, staffId });
      throw new AppError('Failed to fetch performance metrics', 500, 'METRICS_FETCH_FAILED', null, { staffId });
    } finally {
      perf.end();
    }
  }

  /**
   * Calculate total points from performance metrics
   * @param {Object} metrics - Performance metrics
   * @returns {number} - Total points
   */
  calculatePoints(metrics) {
    const {
      completedOrders,
      closedInDiningOrders,
      tableTurnovers,
      quickCheckIns,
      positiveFeedback,
      tipsReceived,
      bookingsHandled,
      staffRequestsFulfilled,
    } = metrics;

    return (
      completedOrders * this.pointValues.orderCompleted +
      closedInDiningOrders * this.pointValues.inDiningOrderClosed +
      tableTurnovers * this.pointValues.tableTurnover +
      quickCheckIns * this.pointValues.quickCheckIn +
      positiveFeedback * this.pointValues.positiveFeedback +
      Math.floor(tipsReceived * this.pointValues.tipReceived) +
      bookingsHandled * this.pointValues.bookingHandled +
      staffRequestsFulfilled * this.pointValues.staffRequestFulfilled
    );
  }

  /**
   * Determine performance tier based on points
   * @param {number} points - Total points
   * @returns {Object} - Tier object
   */
  determineTier(points) {
    for (const [tierName, tier] of Object.entries(this.tiers)) {
      if (points >= tier.minPoints && points <= tier.maxPoints) {
        return tier;
      }
    }
    return this.tiers.BRONZE;
  }

  /**
   * Calculate reward value based on type and points
   * @param {string} rewardType - Type of reward
   * @param {number} points - Points to redeem
   * @returns {string} - Reward value
   */
  calculateRewardValue(rewardType, points) {
    switch (rewardType) {
      case 'gift_card':
        return `${(points / 100).toFixed(2)} MWK`;
      case 'time_off':
        return `${Math.floor(points / 200)} hours`;
      case 'cash':
        return `${(points / 150).toFixed(2)} MWK`;
      default:
        return '0';
    }
  }

  /**
   * Notify staff of a tier change
   * @param {Object} staff - Staff model instance
   * @param {Object} tier - New tier object
   */
  async notifyTierChange(staff, tier) {
    if (!this.notificationService) {
      logger.warn('Notification service not initialized', { staffId: staff.id });
      return;
    }

    const message = `Congratulations! You've reached ${tier.label} tier!`;
    await Notification.create({
      user_id: staff.user_id,
      type: 'tier_change',
      message,
      priority: 'MEDIUM',
    });

    await this.notificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'tier_change', parameters: { tier: tier.label } },
      content: message,
      recipient: staff.user.phone || process.env.DEFAULT_STAFF_PHONE,
    });

    logger.info('Tier change notification sent', { staffId: staff.id, tier: tier.label });
  }

  /**
   * Notify staff of a reward redemption
   * @param {Object} staff - Staff model instance
   * @param {string} rewardType - Type of reward
   * @param {number} pointsToRedeem - Points redeemed
   * @param {string} rewardValue - Value of the reward
   */
  async notifyRewardRedemption(staff, rewardType, pointsToRedeem, rewardValue) {
    if (!this.notificationService) {
      logger.warn('Notification service not initialized', { staffId: staff.id });
      return;
    }

    const message = `You redeemed ${pointsToRedeem} points for ${rewardType} worth ${rewardValue}!`;
    await Notification.create({
      user_id: staff.user_id,
      type: 'reward_redemption',
      message,
      priority: 'MEDIUM',
    });

    await this.notificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'reward_redemption', parameters: { rewardType, points: pointsToRedeem, value: rewardValue } },
      content: message,
      recipient: staff.user.phone || process.env.DEFAULT_STAFF_PHONE,
    });

    logger.info('Reward redemption notification sent', { staffId: staff.id, rewardType, pointsToRedeem });
  }

  /**
   * Update staff performance in real-time
   * @param {Object} staff - Staff model instance
   */
  async updateRealTimePerformance(staff) {
    const perf = this.performanceMonitor.start('updateRealTimePerformance');
    try {
      const staffData = await Staff.findByPk(staff.id, {
        include: [{ model: User, as: 'user' }],
      });

      if (!staffData) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId: staff.id });
      }

      const performanceData = {
        staffId: staffData.id,
        points: staffData.performance_metrics.points,
        tier: staffData.performance_metrics.tier,
        name: staffData.user.getFullName(),
        branchId: staffData.branch_id,
        updatedAt: new Date(),
      };

      if (staffData.branch_id) {
        this.io.to(`branch_${staffData.branch_id}`).emit('staffPerformanceUpdate', performanceData);
        logger.info('Real-time performance updated', performanceData);
      } else {
        logger.warn('Real-time performance update skipped due to missing branch_id', { staffId: staffData.id });
      }
    } catch (error) {
      logger.error('Failed to update real-time performance', { error: error.message, staffId: staff.id });
      throw new AppError('Real-time update failed', 500, 'REALTIME_UPDATE_FAILED', null, { staffId: staff.id });
    } finally {
      perf.end();
    }
  }
}

module.exports = PerformanceIncentiveService;