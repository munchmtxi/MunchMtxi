// src/services/merchantServices/branchProfileServices/branchInsightsService.js

const { Op } = require('sequelize');
const { 
  BranchInsights, 
  MerchantBranch, 
  Order, 
  BranchMetrics 
} = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class BranchInsightsService {
  constructor() {
    this.SENTIMENT_KEYWORDS = {
      positive: ['excellent', 'great', 'good', 'amazing', 'perfect', 'fantastic'],
      negative: ['poor', 'bad', 'terrible', 'awful', 'horrible', 'disappointed']
    };

    this.METRICS_THRESHOLDS = {
      load: { warning: 0.7, critical: 0.9 },
      efficiency: { warning: 0.6, critical: 0.4 },
      quality: { warning: 0.7, critical: 0.5 }
    };
  }

  /**
   * Generate comprehensive insights for a branch
   */
  async generateInsights(merchantId, branchId, timeframe = 'week', metrics = ['all']) {
    const branch = await this._validateBranchAccess(merchantId, branchId);
    const [startDate, endDate] = this._getTimeframeDates(timeframe);

    const [
      performanceMetrics,
      sentimentData,
      routingStats
    ] = await Promise.all([
      this._getPerformanceMetrics(branchId, startDate, endDate),
      this._getSentimentMetrics(branchId, startDate, endDate),
      this._getRoutingMetrics(branchId, startDate, endDate)
    ]);

    // Calculate overall branch score
    const branchScore = this._calculateBranchScore(
      performanceMetrics,
      sentimentData,
      routingStats
    );

    const insights = {
      period: { startDate, endDate },
      performance: performanceMetrics,
      sentiment: sentimentData,
      routing: routingStats,
      score: branchScore,
      generated_at: new Date()
    };

    // Store insights
    await BranchInsights.upsert({
      merchant_id: merchantId,
      branch_id: branchId,
      period_start: startDate,
      period_end: endDate,
      metrics: performanceMetrics,
      customer_sentiment: sentimentData,
      order_routing_stats: routingStats
    });

    return insights;
  }

  /**
   * Compare performance across branches
   */
  async compareBranches(merchantId, timeframe, metrics, limit = 10) {
    const [startDate, endDate] = this._getTimeframeDates(timeframe);

    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchantId, is_active: true },
      include: [{
        model: BranchMetrics,
        as: 'metrics',
        where: {
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }],
      limit
    });

    return branches.map(branch => ({
      branch_id: branch.id,
      name: branch.name,
      metrics: this._aggregateMetrics(branch.metrics, metrics),
      rank: this._calculateBranchRank(branch.metrics)
    }));
  }

  /**
   * Get real-time performance metrics
   */
  async getPerformanceMetrics(merchantId, branchId, requestedMetrics) {
    const branch = await this._validateBranchAccess(merchantId, branchId);
    
    const metrics = await BranchMetrics.findOne({
      where: { branch_id: branchId },
      order: [['created_at', 'DESC']]
    });

    const performance = this._processPerformanceMetrics(metrics, requestedMetrics);
    const alerts = this._checkPerformanceAlerts(performance);

    return {
      current_metrics: performance,
      alerts,
      updated_at: new Date()
    };
  }

  /**
   * Analyze customer sentiment
   */
  async analyzeSentiment(merchantId, branchId, timeframe, includeComments = false) {
    const [startDate, endDate] = this._getTimeframeDates(timeframe);

    const orders = await Order.findAll({
      where: {
        branch_id: branchId,
        created_at: { [Op.between]: [startDate, endDate] },
        customer_feedback: { [Op.not]: null }
      },
      attributes: ['customer_feedback', 'rating', 'created_at']
    });

    const sentiment = this._analyzeFeedbackSentiment(orders);
    const trends = this._analyzeSentimentTrends(orders);

    return {
      summary: sentiment,
      trends,
      sample_size: orders.length,
      comments: includeComments ? this._extractKeyComments(orders) : undefined
    };
  }

  /**
   * Update branch autonomy settings
   */
  async updateAutonomy(merchantId, branchId, settings) {
    const branch = await this._validateBranchAccess(merchantId, branchId);

    const validatedSettings = this._validateAutonomySettings(settings);
    
    await branch.update({
      autonomy_settings: {
        ...branch.autonomy_settings,
        ...validatedSettings
      }
    });

    return branch.autonomy_settings;
  }

  /**
   * Find optimal branch for order routing
   */
  async findOptimalBranch(merchantId, orderId, deliveryLocation, constraints = {}) {
    const branches = await MerchantBranch.findAll({
      where: { 
        merchant_id: merchantId,
        is_active: true
      },
      include: [{
        model: BranchMetrics,
        as: 'metrics'
      }]
    });

    if (!branches.length) {
      throw new AppError('No available branches found', 404);
    }

    const scores = await Promise.all(
      branches.map(branch => this._calculateRoutingScore(
        branch,
        deliveryLocation,
        constraints
      ))
    );

    const optimalBranch = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return {
      branch_id: optimalBranch.branchId,
      score: optimalBranch.score,
      estimated_delivery_time: optimalBranch.estimatedDeliveryTime,
      current_load: optimalBranch.currentLoad
    };
  }

  /**
   * Update real-time metrics
   */
  async updateMetrics(merchantId, branchId, metrics) {
    const branch = await this._validateBranchAccess(merchantId, branchId);

    await BranchMetrics.create({
      branch_id: branchId,
      ...metrics,
      recorded_at: new Date()
    });

    return this.getPerformanceMetrics(merchantId, branchId, Object.keys(metrics));
  }

  /**
   * Process customer feedback
   */
  async processFeedback(merchantId, branchId, feedback) {
    await this._validateBranchAccess(merchantId, branchId);

    const sentiment = this._determineSentiment(feedback.comment);
    
    await BranchMetrics.update(
      {
        feedback_count: sequelize.literal('feedback_count + 1'),
        [`${sentiment}_feedback_count`]: sequelize.literal(`${sentiment}_feedback_count + 1`)
      },
      { where: { branch_id: branchId } }
    );

    return { sentiment, processed_at: new Date() };
  }

  /**
   * Handle performance alerts
   */
  async handlePerformanceAlert(merchantId, branchId, alert) {
    const branch = await this._validateBranchAccess(merchantId, branchId);
    
    // Log alert
    logger.warn('Branch performance alert', {
      merchantId,
      branchId,
      alert,
      timestamp: new Date()
    });

    // Update branch metrics
    await BranchMetrics.update(
      {
        alert_count: sequelize.literal('alert_count + 1'),
        last_alert: alert
      },
      { where: { branch_id: branchId } }
    );

    return {
      status: 'processed',
      branch_id: branchId,
      alert,
      processed_at: new Date()
    };
  }

  // Private helper methods
  async _validateBranchAccess(merchantId, branchId) {
    const branch = await MerchantBranch.findOne({
      where: { id: branchId, merchant_id: merchantId }
    });

    if (!branch) {
      throw new AppError('Branch not found or access denied', 404);
    }

    return branch;
  }

  _getTimeframeDates(timeframe) {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return [startDate, endDate];
  }

  _determineSentiment(text) {
    const lowercaseText = text.toLowerCase();
    
    const positiveCount = this.SENTIMENT_KEYWORDS.positive.filter(word => 
      lowercaseText.includes(word)
    ).length;
    
    const negativeCount = this.SENTIMENT_KEYWORDS.negative.filter(word => 
      lowercaseText.includes(word)
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  _validateAutonomySettings(settings) {
    const validKeys = [
      'order_management',
      'inventory_management',
      'pricing_control',
      'staff_management'
    ];

    return Object.fromEntries(
      validKeys
        .filter(key => settings.hasOwnProperty(key))
        .map(key => [key, Boolean(settings[key])])
    );
  }

  async _calculateRoutingScore(branch, deliveryLocation, constraints) {
    const locationScore = await this._calculateLocationScore(
      branch.location,
      deliveryLocation
    );

    const loadScore = this._calculateLoadScore(branch.metrics);
    const capacityScore = this._calculateCapacityScore(branch, constraints);

    const score = (locationScore * 0.4) + (loadScore * 0.3) + (capacityScore * 0.3);

    return {
      branchId: branch.id,
      score,
      currentLoad: branch.metrics.current_load,
      estimatedDeliveryTime: this._estimateDeliveryTime(locationScore, branch.metrics)
    };
  }

  _checkPerformanceAlerts(metrics) {
    const alerts = [];

    Object.entries(metrics).forEach(([metric, value]) => {
      const thresholds = this.METRICS_THRESHOLDS[metric];
      if (thresholds) {
        if (value <= thresholds.critical) {
          alerts.push({
            metric,
            level: 'critical',
            value,
            threshold: thresholds.critical
          });
        } else if (value <= thresholds.warning) {
          alerts.push({
            metric,
            level: 'warning',
            value,
            threshold: thresholds.warning
          });
        }
      }
    });

    return alerts;
  }
}

module.exports = new BranchInsightsService();