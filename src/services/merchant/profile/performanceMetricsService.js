'use strict';

const { MerchantPerformanceMetrics, Order, Merchant, sequelize } = require('@models'); // Fix import
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class PerformanceMetricsService {
  constructor() {
    this.periodTypes = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
  }

  async getPerformanceMetrics(merchantId, periodType = 'daily', startDate, endDate) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      if (!this.periodTypes.includes(periodType)) {
        throw new AppError(
          'Invalid period type',
          400,
          'INVALID_PERIOD_TYPE',
          { allowedTypes: this.periodTypes }
        );
      }

      const end = endDate || new Date();
      const start = startDate || this.getDefaultStartDate(periodType);

      const metrics = await MerchantPerformanceMetrics.findAll({
        where: {
          merchant_id: merchantId,
          period_type: periodType,
          period_start: {
            [Op.between]: [start, end],
          },
        },
        order: [['period_start', 'ASC']],
      });

      if (metrics.length === 0) {
        return await this.calculateAndStoreMetrics(merchantId, periodType, start, end);
      }

      return metrics;
    } catch (error) {
      logger.error('Error fetching performance metrics:', {
        merchantId,
        periodType,
        error: error.message,
      });
      throw error;
    }
  }

  async calculateAndStoreMetrics(merchantId, periodType, startDate, endDate) {
    const transaction = await sequelize.transaction();
    try {
      // Adjust end date for the period
      let adjustedEndDate;
      switch (periodType) {
        case 'daily':
          adjustedEndDate = new Date(startDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
          break;
        case 'hourly':
          adjustedEndDate = new Date(startDate);
          adjustedEndDate.setHours(adjustedEndDate.getHours() + 1);
          break;
        case 'weekly':
          adjustedEndDate = new Date(startDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() + 7);
          break;
        case 'monthly':
          adjustedEndDate = new Date(startDate);
          adjustedEndDate.setMonth(adjustedEndDate.getMonth() + 1);
          break;
        case 'yearly':
          adjustedEndDate = new Date(startDate);
          adjustedEndDate.setFullYear(adjustedEndDate.getFullYear() + 1);
          break;
        default:
          adjustedEndDate = new Date(endDate);
      }
  
      const orders = await Order.findAll({
        where: {
          merchant_id: merchantId,
          created_at: {
            [Op.between]: [startDate, adjustedEndDate], // Use adjusted end date
          },
        },
        attributes: ['status', 'total_amount'],
        transaction,
      });
  
      const metrics = this.calculateMetricsFromOrders(orders);
  
      const createdMetrics = await MerchantPerformanceMetrics.create({
        merchant_id: merchantId,
        period_type: periodType,
        period_start: startDate,
        period_end: adjustedEndDate,
        ...metrics,
      }, { transaction });
  
      await transaction.commit();
      logger.info('Metrics calculated and stored:', {
        merchantId,
        periodType,
        periodStart: startDate,
        periodEnd: adjustedEndDate,
      });
  
      return createdMetrics;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error calculating and storing metrics:', {
        merchantId,
        periodType,
        error: error.message,
      });
      throw error;
    }
  }

  calculateMetricsFromOrders(orders) {
    const metrics = {
      orders_count: orders.length,
      completed_orders: orders.filter(o => o.status === 'completed').length,
      cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
      total_revenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      net_revenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0),
      refund_amount: 0, // No column
    };

    metrics.avg_order_value = metrics.orders_count > 0
      ? metrics.total_revenue / metrics.orders_count
      : 0;

    metrics.average_rating = 0; // No rating column
    metrics.total_ratings = 0;  // No rating column
    metrics.rating_distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }; // Default

    return metrics;
  }

  async updateMetricsForOrder(orderId) {
    const transaction = await sequelize.transaction();
    try {
      const order = await Order.findByPk(orderId, {
        attributes: ['merchant_id', 'status', 'total_amount'],
        transaction,
      });
      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
  
      const [metrics, created] = await MerchantPerformanceMetrics.findOrCreate({
        where: {
          merchant_id: order.merchant_id,
          period_type: 'daily',
          period_start: today,
        },
        defaults: {
          period_end: tomorrow,
          orders_count: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          total_revenue: 0,
          net_revenue: 0,
          refund_amount: 0,
          avg_order_value: 0,
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        },
        transaction,
      });
  
      let updates = {
        orders_count: sequelize.literal('orders_count + 1'),
      };
  
      switch (order.status) {
        case 'completed':
          updates.completed_orders = sequelize.literal('completed_orders + 1');
          updates.total_revenue = sequelize.literal(`total_revenue + ${order.total_amount || 0}`);
          updates.net_revenue = sequelize.literal(`net_revenue + ${order.total_amount || 0}`);
          break;
        case 'cancelled':
          updates.cancelled_orders = sequelize.literal('cancelled_orders + 1');
          break;
        case 'refunded':
          // No revenue adjustment
          break;
        default:
          // Non-final statuses counted in orders_count
          break;
      }
  
      // Use updated values for avg_order_value
      updates.avg_order_value = sequelize.literal(
        `CASE WHEN (orders_count + 1) = 0 THEN 0 ELSE (total_revenue + ${order.total_amount || 0}) / (orders_count + 1) END`
      );
  
      await metrics.update(updates, { transaction });
  
      await transaction.commit();
      logger.info('Metrics updated for order:', { orderId, merchantId: order.merchant_id });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating metrics for order:', { orderId, error: error.message });
      throw error;
    }
  }

  async recalculateAverageRating(merchantId, date, transaction) {
    const orders = await Order.findAll({
      where: {
        merchant_id: merchantId,
        created_at: {
          [Op.gte]: date,
          [Op.lt]: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        },
        rating: { [Op.ne]: null },
      },
      attributes: ['rating'],
      transaction,
    });

    const ratings = orders.map(o => o.rating);
    return ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;
  }

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
}

module.exports = new PerformanceMetricsService();