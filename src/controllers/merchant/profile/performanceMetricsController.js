'use strict';

const PerformanceMetricsService = require('@services/merchant/profile/performanceMetricsService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class PerformanceMetricsController {
  /**
   * Get performance metrics for the authenticated merchant.
   * @route GET /api/merchant/profile/performance-metrics
   * @query {string} [periodType] - The period type (hourly, daily, weekly, monthly, yearly).
   * @query {string} [startDate] - ISO date string for the start of the period.
   * @query {string} [endDate] - ISO date string for the end of the period.
   */
  getPerformanceMetrics = catchAsync(async (req, res, next) => {
    const { periodType, startDate, endDate } = req.query;
    const merchantId = req.user.merchantId; // Assumes middleware sets this

    logger.info('Fetching performance metrics', {
      merchantId,
      periodType,
      startDate,
      endDate,
    });

    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    // Validate date parsing
    if (startDate && isNaN(parsedStartDate.getTime())) {
      return next(new AppError('Invalid start date format', 400, 'INVALID_DATE'));
    }
    if (endDate && isNaN(parsedEndDate.getTime())) {
      return next(new AppError('Invalid end date format', 400, 'INVALID_DATE'));
    }
    // Changed >= to > to allow same-day ranges
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return next(new AppError('Start date must be before end date', 400, 'INVALID_DATE_RANGE'));
    }

    const metrics = await PerformanceMetricsService.getPerformanceMetrics(
      merchantId,
      periodType,
      parsedStartDate,
      parsedEndDate
    );

    res.status(200).json({
      status: 'success',
      data: metrics,
    });
  });

  /**
   * Update metrics for a specific order (e.g., after order status change).
   * @route POST /api/merchant/profile/performance-metrics/update-order
   * @body {number} orderId - The ID of the order to update metrics for.
   */
  updateMetricsForOrder = catchAsync(async (req, res, next) => {
    const { orderId } = req.body;
    const merchantId = req.user.merchantId; // Assumes middleware sets this

    if (!orderId || isNaN(orderId)) {
      return next(new AppError('Valid orderId is required', 400, 'INVALID_ORDER_ID'));
    }

    logger.info('Updating metrics for order', { merchantId, orderId });

    await PerformanceMetricsService.updateMetricsForOrder(orderId);

    res.status(200).json({
      status: 'success',
      message: 'Metrics updated successfully',
    });
  });

  /**
   * Force recalculate and store metrics for a specific period.
   * @route POST /api/merchant/profile/performance-metrics/recalculate
   * @body {string} [periodType] - The period type to recalculate.
   * @body {string} [startDate] - ISO date string for the start of the period.
   * @body {string} [endDate] - ISO date string for the end of the period.
   */
  recalculateMetrics = catchAsync(async (req, res, next) => {
    const { periodType, startDate, endDate } = req.body;
    const merchantId = req.user.merchantId; // Assumes middleware sets this

    logger.info('Recalculating performance metrics', {
      merchantId,
      periodType,
      startDate,
      endDate,
    });

    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    // Validate date parsing
    if (startDate && isNaN(parsedStartDate.getTime())) {
      return next(new AppError('Invalid start date format', 400, 'INVALID_DATE'));
    }
    if (endDate && isNaN(parsedEndDate.getTime())) {
      return next(new AppError('Invalid end date format', 400, 'INVALID_DATE'));
    }
    if (parsedStartDate && parsedEndDate && parsedStartDate >= parsedEndDate) {
      return next(new AppError('Start date must be before end date', 400, 'INVALID_DATE_RANGE'));
    }

    const metrics = await PerformanceMetricsService.calculateAndStoreMetrics(
      merchantId,
      periodType || 'daily',
      parsedStartDate,
      parsedEndDate
    );

    res.status(201).json({
      status: 'success',
      data: metrics,
      message: 'Metrics recalculated and stored',
    });
  });
}

module.exports = new PerformanceMetricsController();