'use strict';
const { 
  MerchantProfileAnalytics, 
  MerchantActiveViewer,
  User,
  Merchant 
} = require('@models');
const { Op, fn, col, literal } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class ProfileAnalyticsService {
  constructor() {
    this.CLEANUP_INTERVAL = 5 * 60 * 1000;
    this.INACTIVE_THRESHOLD = 5 * 60 * 1000;
    
    setInterval(() => {
      this.cleanupInactiveViewers().catch(error => {
        logger.error('Failed to cleanup inactive viewers:', error);
      });
    }, this.CLEANUP_INTERVAL);
  }

  async recordProfileView({
    merchantId,
    viewerId,
    source = 'direct',
    deviceType,
    sessionId = uuidv4(),
    viewType = 'profile',
    locationData
  }) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

      const existingView = await MerchantProfileAnalytics.findOne({
        where: {
          merchant_id: merchantId,
          session_id: sessionId,
          created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      const analytics = await MerchantProfileAnalytics.create({
        merchant_id: merchantId,
        viewer_id: viewerId,
        source,
        device_type: deviceType,
        session_id: sessionId,
        is_unique: !existingView,
        view_type: viewType,
        location_data: locationData
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to record profile view:', { merchantId, viewerId, error: error.message });
      throw error;
    }
  }

  async updateViewAnalytics(sessionId, updates) {
    try {
      const analytics = await MerchantProfileAnalytics.findOne({ where: { session_id: sessionId } });
      if (!analytics) {
        throw new AppError('Analytics session not found', 404, 'ANALYTICS_NOT_FOUND');
      }

      if (updates.viewDuration) analytics.view_duration = updates.viewDuration;
      if (updates.interactionCount) analytics.interaction_count = updates.interactionCount;

      await analytics.save();
      return analytics;
    } catch (error) {
      logger.error('Failed to update view analytics:', { sessionId, error: error.message });
      throw error;
    }
  }

  async trackActiveViewer({
    merchantId,
    viewerId,
    socketId,
    sessionId = uuidv4(),
    viewerType = 'guest',
    viewerData = {}
  }) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

      const [viewer, created] = await MerchantActiveViewer.findOrCreate({
        where: { socket_id: socketId },
        defaults: {
          merchant_id: merchantId,
          viewer_id: viewerId,
          socket_id: socketId,
          session_id: sessionId,
          viewer_type: viewerType,
          viewer_data: viewerData,
          status: 'active',
          last_activity: new Date()
        }
      });

      if (!created) await viewer.updateActivity();

      const activeViewersCount = await this.getActiveViewersCount(merchantId);
      return viewer;
    } catch (error) {
      logger.error('Failed to track active viewer:', { merchantId, viewerId, error: error.message });
      throw error;
    }
  }

  async getActiveViewers(merchantId) {
    try {
      return await MerchantActiveViewer.findAll({
        where: {
          merchant_id: merchantId,
          status: 'active',
          last_activity: { [Op.gte]: new Date(Date.now() - this.INACTIVE_THRESHOLD) }
        },
        include: [{ model: User, as: 'viewer', attributes: ['id', 'first_name', 'last_name', 'avatar_url'] }]
      });
    } catch (error) {
      logger.error('Failed to get active viewers:', { merchantId, error: error.message });
      throw error;
    }
  }

  async getActiveViewersCount(merchantId) {
    try {
      return await MerchantActiveViewer.count({
        where: {
          merchant_id: merchantId,
          status: 'active',
          last_activity: { [Op.gte]: new Date(Date.now() - this.INACTIVE_THRESHOLD) }
        }
      });
    } catch (error) {
      logger.error('Failed to get active viewers count:', { merchantId, error: error.message });
      throw error;
    }
  }

  async cleanupInactiveViewers() {
    try {
      const deletedCount = await MerchantActiveViewer.destroy({
        where: {
          last_activity: { [Op.lt]: new Date(Date.now() - this.INACTIVE_THRESHOLD) }
        }
      });
      logger.info('Cleaned up inactive viewers:', { count: deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Cleanup inactive viewers failed:', error);
      throw error;
    }
  }

  async getAnalyticsSummary(merchantId, period = '24h') {
    try {
      const timeRange = this.getTimeRange(period);
      const analytics = await MerchantProfileAnalytics.findAll({
        where: { merchant_id: merchantId, created_at: { [Op.gte]: timeRange.start, [Op.lte]: timeRange.end } },
        attributes: [
          [fn('COUNT', col('id')), 'total_views'],
          [fn('SUM', literal('CASE WHEN is_unique THEN 1 ELSE 0 END')), 'unique_views'],
          [fn('AVG', col('view_duration')), 'avg_duration'],
          [fn('AVG', col('interaction_count')), 'avg_interactions'],
          [fn('COUNT', literal('CASE WHEN viewer_id IS NOT NULL THEN 1 END')), 'authenticated_views']
        ],
        raw: true
      });
  
      const viewsByType = await MerchantProfileAnalytics.findAll({
        where: { merchant_id: merchantId, created_at: { [Op.gte]: timeRange.start, [Op.lte]: timeRange.end } },
        attributes: ['view_type', [fn('COUNT', col('id')), 'count']],
        group: ['view_type'],
        raw: true
      });
  
      const summary = analytics[0] || {};
      return {
        summary: {
          total_views: parseInt(summary.total_views || 0),
          unique_views: parseInt(summary.unique_views || 0) || null,
          avg_duration: summary.avg_duration ? parseFloat(summary.avg_duration) : null,
          avg_interactions: summary.avg_interactions ? parseFloat(summary.avg_interactions) : null,
          authenticated_views: parseInt(summary.authenticated_views || 0)
        },
        viewsByType: viewsByType.reduce((acc, type) => {
          acc[type.view_type] = parseInt(type.count);
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Failed to get analytics summary:', { merchantId, period, error: error.message });
      throw error;
    }
  }

  async getDetailedAnalytics(merchantId, filters = {}) {
    try {
      const where = { merchant_id: merchantId };
      if (filters.startDate && filters.endDate) {
        where.created_at = { [Op.between]: [filters.startDate, filters.endDate] };
      }
      if (filters.viewType) where.view_type = filters.viewType;
      if (filters.source) where.source = filters.source;

      const analytics = await MerchantProfileAnalytics.findAll({
        where,
        include: [{ model: User, as: 'viewer', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['created_at', 'DESC']],
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to get detailed analytics:', { merchantId, filters, error: error.message });
      throw error;
    }
  }

  getTimeRange(period) {
    const end = new Date();
    let start;
    switch (period) {
      case '24h': start = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
      case '7d': start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      default: throw new AppError('Invalid period', 400, 'INVALID_PERIOD');
    }
    return { start, end };
  }
}

module.exports = new ProfileAnalyticsService();