// src/services/merchantServices/profileServices/performanceMetricsService.js
const { MerchantPerformanceMetrics, Order, Merchant } = require('@models');
const { Op } = require('sequelize');
const { EVENTS } = require('@config/events');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const eventManager = require('@services/eventManager');
const sequelize = require('sequelize');

class PerformanceMetricsService {
  constructor() {
    this.periodTypes = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
  }

  /**
   * Get merchant performance metrics for a specific period
   * @param {number} merchantId - The merchant ID
   * @param {string} periodType - Type of period (hourly/daily/weekly/monthly/yearly)
   * @param {Date} startDate - Start date for metrics
   * @param {Date} endDate - End date for metrics
   */
  async getPerformanceMetrics(merchantId, periodType = 'daily', startDate, endDate) {
    try {
      // Validate period type
      if (!this.periodTypes.includes(periodType)) {
        throw new AppError(
          'Invalid period type',
          400,
          'INVALID_PERIOD_TYPE',
          { allowedTypes: this.periodTypes }
        );
      }

      // Default date range if not provided
      const end = endDate || new Date();
      const start = startDate || this.getDefaultStartDate(periodType);

      const metrics = await MerchantPerformanceMetrics.findAll({
        where: {
          merchant_id: merchantId,
          period_type: periodType,
          period_start: {
            [Op.between]: [start, end]
          }
        },
        order: [['period_start', 'ASC']]
      });

      // If no metrics found, calculate them
      if (metrics.length === 0) {
        return await this.calculateMetrics(merchantId, periodType, start, end);
      }

      return metrics;

    } catch (error) {
      logger.error('Error fetching performance metrics:', {
        merchantId,
        periodType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific period
   */
  async calculateMetrics(merchantId, periodType, startDate, endDate) {
    const t = await sequelize.transaction();

    try {
      // Get all orders for the period
      const orders = await Order.findAll({
        where: {
          merchant_id: merchantId,
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        transaction: t
      });

      // Calculate aggregate metrics
      const metrics = {
        orders_count: orders.length,
        completed_orders: orders.filter(o => o.status === 'completed').length,
        cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
        total_revenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        net_revenue: orders
          .filter(o => o.status === 'completed')
          .reduce((sum, order) => sum + (order.total_amount || 0), 0),
        refund_amount: orders
          .filter(o => o.status === 'refunded')
          .reduce((sum, order) => sum + (order.refund_amount || 0), 0)
      };

      // Calculate ratings
      const ratings = orders.map(o => o.rating).filter(r => r !== null);
      metrics.average_rating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
      metrics.total_ratings = ratings.length;

      // Calculate rating distribution
      metrics.rating_distribution = ratings.reduce((dist, rating) => {
        dist[rating] = (dist[rating] || 0) + 1;
        return dist;
      }, { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });

      // Create metrics record
      const createdMetrics = await MerchantPerformanceMetrics.create({
        merchant_id: merchantId,
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        ...metrics
      }, { transaction: t });

      await t.commit();

      // Emit metrics updated event
      eventManager.emit(EVENTS.MERCHANT.METRICS.UPDATED, {
        merchantId,
        periodType,
        metrics: createdMetrics
      });

      return createdMetrics;

    } catch (error) {
      await t.rollback();
      logger.error('Error calculating metrics:', {
        merchantId,
        periodType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comparison metrics between two periods
   */
  async getMetricsComparison(merchantId, periodType, currentStart, previousStart) {
    try {
      const [currentMetrics, previousMetrics] = await Promise.all([
        this.getPerformanceMetrics(merchantId, periodType, currentStart, new Date()),
        this.getPerformanceMetrics(merchantId, periodType, previousStart, currentStart)
      ]);

      return this.calculateMetricsDifference(currentMetrics, previousMetrics);

    } catch (error) {
      logger.error('Error getting metrics comparison:', {
        merchantId,
        periodType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate percentage difference between metrics
   */
  calculateMetricsDifference(current, previous) {
    const calculatePercentageChange = (currentVal, previousVal) => {
      if (previousVal === 0) return currentVal > 0 ? 100 : 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    return {
      orders_count_change: calculatePercentageChange(
        current.orders_count,
        previous.orders_count
      ),
      revenue_change: calculatePercentageChange(
        current.total_revenue,
        previous.total_revenue
      ),
      rating_change: calculatePercentageChange(
        current.average_rating,
        previous.average_rating
      ),
      completion_rate_change: calculatePercentageChange(
        current.getCompletionRate(),
        previous.getCompletionRate()
      )
    };
  }

  /**
   * Get default start date based on period type
   */
  getDefaultStartDate(periodType) {
    const now = new Date();
    switch (periodType) {
      case 'hourly':
        return new Date(now.setHours(now.getHours() - 24));
      case 'daily':
        return new Date(now.setDate(now.getDate() - 30));
      case 'weekly':
        return new Date(now.setDate(now.getDate() - 90));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() - 12));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() - 5));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * Update metrics after order status change
   */
  async updateMetricsForOrder(orderId) {
    const t = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction: t });
      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      }

      // Get current day's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [metrics] = await MerchantPerformanceMetrics.findOrCreate({
        where: {
          merchant_id: order.merchant_id,
          period_type: 'daily',
          period_start: today
        },
        defaults: {
          period_end: new Date(today.setDate(today.getDate() + 1)),
          orders_count: 0,
          total_revenue: 0
        },
        transaction: t
      });

      // Update metrics based on order status
      switch (order.status) {
        case 'completed':
          await metrics.increment('completed_orders', { transaction: t });
          await metrics.increment('total_revenue', { 
            by: order.total_amount,
            transaction: t 
          });
          break;
        case 'cancelled':
          await metrics.increment('cancelled_orders', { transaction: t });
          break;
        case 'refunded':
          await metrics.increment('refund_amount', { 
            by: order.refund_amount,
            transaction: t 
          });
          break;
      }

      await t.commit();

      // Emit metrics updated event
      eventManager.emit(EVENTS.MERCHANT.METRICS.ORDER_UPDATED, {
        merchantId: order.merchant_id,
        orderId,
        metrics: await metrics.reload()
      });

    } catch (error) {
      await t.rollback();
      logger.error('Error updating metrics for order:', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new PerformanceMetricsService();