// src/services/merchantServices/profileServices/profileAnalyticsService.js
const { 
    MerchantProfileAnalytics, 
    MerchantActiveViewer,
    User,
    Merchant 
  } = require('@models');
  const { Op } = require('sequelize');
  const { v4: uuidv4 } = require('uuid');
  const AppError = require('@utils/AppError');
  const { logger } = require('@utils/logger');
  const eventManager = require('@services/eventManager');
  const { EVENTS } = require('@config/events');
  
  class ProfileAnalyticsService {
    constructor() {
      this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
      this.INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      
      // Start cleanup interval
      setInterval(() => {
        this.cleanupInactiveViewers().catch(error => {
          logger.error('Failed to cleanup inactive viewers:', error);
        });
      }, this.CLEANUP_INTERVAL);
    }
  
    /**
     * Record a new profile view
     */
    async recordProfileView({
      merchantId,
      viewerId,
      source,
      deviceType,
      sessionId = uuidv4(),
      viewType = 'profile',
      locationData
    }) {
      try {
        // Check if this is a unique view for this session
        const existingView = await MerchantProfileAnalytics.findOne({
          where: {
            merchant_id: merchantId,
            session_id: sessionId,
            created_at: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
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
  
        // Emit analytics event
        eventManager.emit(EVENTS.MERCHANT.PROFILE.ANALYTICS_UPDATED, {
          merchantId,
          viewerId,
          analytics
        });
  
        return analytics;
  
      } catch (error) {
        logger.error('Failed to record profile view:', {
          merchantId,
          viewerId,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Update view duration and interactions
     */
    async updateViewAnalytics(sessionId, updates) {
      try {
        const analytics = await MerchantProfileAnalytics.findOne({
          where: { session_id: sessionId }
        });
  
        if (!analytics) {
          throw new AppError('Analytics session not found', 404, 'ANALYTICS_NOT_FOUND');
        }
  
        if (updates.viewDuration) {
          analytics.view_duration = updates.viewDuration;
        }
  
        if (updates.interactionCount) {
          analytics.interaction_count = updates.interactionCount;
        }
  
        await analytics.save();
  
        return analytics;
  
      } catch (error) {
        logger.error('Failed to update view analytics:', {
          sessionId,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Track active viewer
     */
    async trackActiveViewer({
      merchantId,
      viewerId,
      socketId,
      sessionId = uuidv4(),
      viewerType = 'guest',
      viewerData = {}
    }) {
      try {
        const [viewer, created] = await MerchantActiveViewer.findOrCreate({
          where: { socket_id: socketId },
          defaults: {
            merchant_id: merchantId,
            viewer_id: viewerId,
            session_id: sessionId,
            viewer_type: viewerType,
            viewer_data: viewerData,
            status: 'active'
          }
        });
  
        if (!created) {
          await viewer.updateActivity();
        }
  
        // Get active viewers count
        const activeViewersCount = await this.getActiveViewersCount(merchantId);
  
        // Emit active viewers update
        eventManager.emit(EVENTS.MERCHANT.PROFILE.ACTIVE_VIEWERS_UPDATED, {
          merchantId,
          activeViewers: activeViewersCount
        });
  
        return viewer;
  
      } catch (error) {
        logger.error('Failed to track active viewer:', {
          merchantId,
          viewerId,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Get active viewers for a merchant
     */
    async getActiveViewers(merchantId) {
      try {
        const viewers = await MerchantActiveViewer.findAll({
          where: {
            merchant_id: merchantId,
            status: 'active',
            last_activity: {
              [Op.gte]: new Date(Date.now() - this.INACTIVE_THRESHOLD)
            }
          },
          include: [{
            model: User,
            as: 'viewer',
            attributes: ['id', 'first_name', 'last_name', 'avatar_url']
          }]
        });
  
        return viewers;
  
      } catch (error) {
        logger.error('Failed to get active viewers:', {
          merchantId,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Get active viewers count
     */
    async getActiveViewersCount(merchantId) {
      try {
        return await MerchantActiveViewer.count({
          where: {
            merchant_id: merchantId,
            status: 'active',
            last_activity: {
              [Op.gte]: new Date(Date.now() - this.INACTIVE_THRESHOLD)
            }
          }
        });
      } catch (error) {
        logger.error('Failed to get active viewers count:', {
          merchantId,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Get analytics summary
     */
    async getAnalyticsSummary(merchantId, period = '24h') {
      try {
        const timeRange = this.getTimeRange(period);
        
        const analytics = await MerchantProfileAnalytics.findAll({
          where: {
            merchant_id: merchantId,
            created_at: {
              [Op.gte]: timeRange.start,
              [Op.lte]: timeRange.end
            }
          },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_views'],
            [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_unique THEN 1 ELSE 0 END')), 'unique_views'],
            [sequelize.fn('AVG', sequelize.col('view_duration')), 'avg_duration'],
            [sequelize.fn('AVG', sequelize.col('interaction_count')), 'avg_interactions'],
            [sequelize.fn('COUNT', sequelize.literal('CASE WHEN viewer_id IS NOT NULL THEN 1 END')), 'authenticated_views']
          ],
          group: ['merchant_id']
        });
  
        // Get view distribution by type
        const viewsByType = await MerchantProfileAnalytics.findAll({
          where: {
            merchant_id: merchantId,
            created_at: {
              [Op.gte]: timeRange.start,
              [Op.lte]: timeRange.end
            }
          },
          attributes: [
            'view_type',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['view_type']
        });
  
        return {
          summary: analytics[0] || {},
          viewsByType: viewsByType.reduce((acc, type) => {
            acc[type.view_type] = type.count;
            return acc;
          }, {})
        };
  
      } catch (error) {
        logger.error('Failed to get analytics summary:', {
          merchantId,
          period,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Get detailed analytics
     */
    async getDetailedAnalytics(merchantId, filters = {}) {
      try {
        const where = {
          merchant_id: merchantId
        };
  
        if (filters.startDate && filters.endDate) {
          where.created_at = {
            [Op.between]: [filters.startDate, filters.endDate]
          };
        }
  
        if (filters.viewType) {
          where.view_type = filters.viewType;
        }
  
        if (filters.source) {
          where.source = filters.source;
        }
  
        const analytics = await MerchantProfileAnalytics.findAll({
          where,
          include: [{
            model: User,
            as: 'viewer',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }],
          order: [['created_at', 'DESC']],
          limit: filters.limit || 100,
          offset: filters.offset || 0
        });
  
        return analytics;
  
      } catch (error) {
        logger.error('Failed to get detailed analytics:', {
          merchantId,
          filters,
          error: error.message
        });
        throw error;
      }
    }
  
    /**
     * Cleanup inactive viewers
     */
    async cleanupInactiveViewers() {
      try {
        const result = await MerchantActiveViewer.cleanup();
        logger.info(`Cleaned up ${result} inactive viewers`);
      } catch (error) {
        logger.error('Failed to cleanup inactive viewers:', error);
        throw error;
      }
    }
  
    /**
     * Helper to get time range based on period
     */
    getTimeRange(period) {
      const now = new Date();
      const start = new Date();
  
      switch (period) {
        case '1h':
          start.setHours(start.getHours() - 1);
          break;
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        default:
          start.setHours(start.getHours() - 24);
      }
  
      return { start, end: now };
    }
  }
  
  module.exports = new ProfileAnalyticsService();