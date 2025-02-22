// src/controllers/merchantControllers/profileControllers/performanceMetricsController.js
const catchAsync = require('@utils/catchAsync');
const performanceMetricsService = require('@services/merchantServices/profileServices/performanceMetricsService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * Get performance metrics for a merchant
 * @route GET /api/merchants/metrics
 */
exports.getMetrics = catchAsync(async (req, res) => {
  const { 
    period_type = 'daily',
    start_date,
    end_date 
  } = req.query;

  const startDate = start_date ? new Date(start_date) : null;
  const endDate = end_date ? new Date(end_date) : null;

  const metrics = await performanceMetricsService.getPerformanceMetrics(
    req.user.merchantId,
    period_type,
    startDate,
    endDate
  );

  res.status(200).json({
    status: 'success',
    data: { metrics }
  });
});

/**
 * Get metrics comparison between periods
 * @route GET /api/merchants/metrics/comparison
 */
exports.getMetricsComparison = catchAsync(async (req, res) => {
  const {
    period_type = 'daily',
    current_start,
    previous_start
  } = req.query;

  if (!current_start || !previous_start) {
    throw new AppError(
      'Current and previous start dates are required',
      400,
      'INVALID_DATES'
    );
  }

  const comparison = await performanceMetricsService.getMetricsComparison(
    req.user.merchantId,
    period_type,
    new Date(current_start),
    new Date(previous_start)
  );

  res.status(200).json({
    status: 'success',
    data: { comparison }
  });
});

/**
 * Get metrics for multiple period types
 * @route GET /api/merchants/metrics/overview
 */
exports.getMetricsOverview = catchAsync(async (req, res) => {
  const metrics = {};
  const periodTypes = ['daily', 'weekly', 'monthly'];

  await Promise.all(
    periodTypes.map(async (periodType) => {
      metrics[periodType] = await performanceMetricsService.getPerformanceMetrics(
        req.user.merchantId,
        periodType
      );
    })
  );

  res.status(200).json({
    status: 'success',
    data: { metrics }
  });
});

/**
 * Get detailed order metrics
 * @route GET /api/merchants/metrics/orders
 */
exports.getOrderMetrics = catchAsync(async (req, res) => {
  const { period_type = 'daily' } = req.query;

  const metrics = await performanceMetricsService.getPerformanceMetrics(
    req.user.merchantId,
    period_type
  );

  const orderMetrics = {
    total_orders: metrics.orders_count,
    completed_orders: metrics.completed_orders,
    cancelled_orders: metrics.cancelled_orders,
    completion_rate: metrics.getCompletionRate(),
    cancellation_rate: metrics.getCancellationRate(),
    average_order_value: metrics.calculateAverageOrderValue()
  };

  res.status(200).json({
    status: 'success',
    data: { metrics: orderMetrics }
  });
});

/**
 * Get detailed revenue metrics
 * @route GET /api/merchants/metrics/revenue
 */
exports.getRevenueMetrics = catchAsync(async (req, res) => {
  const { period_type = 'daily' } = req.query;

  const metrics = await performanceMetricsService.getPerformanceMetrics(
    req.user.merchantId,
    period_type
  );

  const revenueMetrics = {
    total_revenue: metrics.total_revenue,
    net_revenue: metrics.net_revenue,
    refund_amount: metrics.refund_amount,
    revenue_per_order: metrics.total_revenue / metrics.orders_count || 0
  };

  res.status(200).json({
    status: 'success',
    data: { metrics: revenueMetrics }
  });
});

/**
 * Get rating metrics
 * @route GET /api/merchants/metrics/ratings
 */
exports.getRatingMetrics = catchAsync(async (req, res) => {
  const { period_type = 'daily' } = req.query;

  const metrics = await performanceMetricsService.getPerformanceMetrics(
    req.user.merchantId,
    period_type
  );

  const ratingMetrics = {
    average_rating: metrics.average_rating,
    total_ratings: metrics.total_ratings,
    rating_distribution: metrics.rating_distribution
  };

  res.status(200).json({
    status: 'success',
    data: { metrics: ratingMetrics }
  });
});

/**
 * Handle metrics recalculation request
 * @route POST /api/merchants/metrics/recalculate
 */
exports.recalculateMetrics = catchAsync(async (req, res) => {
  const { 
    period_type = 'daily',
    start_date,
    end_date 
  } = req.body;

  if (!start_date || !end_date) {
    throw new AppError(
      'Start and end dates are required',
      400,
      'INVALID_DATES'
    );
  }

  const metrics = await performanceMetricsService.calculateMetrics(
    req.user.merchantId,
    period_type,
    new Date(start_date),
    new Date(end_date)
  );

  res.status(200).json({
    status: 'success',
    data: { metrics }
  });
});