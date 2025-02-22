// src/controllers/merchantControllers/profileControllers/profileAnalyticsController.js
const catchAsync = require('@utils/catchAsync');
const profileAnalyticsService = require('@services/merchantServices/profileServices/profileAnalyticsService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class ProfileAnalyticsController {
  /**
   * Record a new profile view
   * @route POST /api/merchants/profile/analytics/view
   */
  recordProfileView = catchAsync(async (req, res) => {
    const {
      source,
      deviceType,
      sessionId,
      viewType,
      locationData
    } = req.body;

    const analytics = await profileAnalyticsService.recordProfileView({
      merchantId: req.params.merchantId,
      viewerId: req.user?.id,
      source,
      deviceType,
      sessionId,
      viewType,
      locationData
    });

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  });

  /**
   * Update view analytics
   * @route PATCH /api/merchants/profile/analytics/view/:sessionId
   */
  updateViewAnalytics = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const { viewDuration, interactionCount } = req.body;

    const analytics = await profileAnalyticsService.updateViewAnalytics(
      sessionId,
      { viewDuration, interactionCount }
    );

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  });

  /**
   * Get active viewers
   * @route GET /api/merchants/profile/analytics/active-viewers
   */
  getActiveViewers = catchAsync(async (req, res) => {
    const viewers = await profileAnalyticsService.getActiveViewers(
      req.params.merchantId
    );

    res.status(200).json({
      status: 'success',
      data: { 
        viewers,
        total: viewers.length
      }
    });
  });

  /**
   * Get analytics summary
   * @route GET /api/merchants/profile/analytics/summary
   */
  getAnalyticsSummary = catchAsync(async (req, res) => {
    const { period } = req.query;

    const summary = await profileAnalyticsService.getAnalyticsSummary(
      req.params.merchantId,
      period
    );

    res.status(200).json({
      status: 'success',
      data: { summary }
    });
  });

  /**
   * Get detailed analytics
   * @route GET /api/merchants/profile/analytics/detailed
   */
  getDetailedAnalytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      viewType,
      source,
      limit,
      offset
    } = req.query;

    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format', 400, 'INVALID_DATE_FORMAT');
      }

      if (end < start) {
        throw new AppError('End date must be after start date', 400, 'INVALID_DATE_RANGE');
      }
    }

    const analytics = await profileAnalyticsService.getDetailedAnalytics(
      req.params.merchantId,
      {
        startDate,
        endDate,
        viewType,
        source,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      }
    );

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  });

  /**
   * Get view type distribution
   * @route GET /api/merchants/profile/analytics/view-types
   */
  getViewTypeDistribution = catchAsync(async (req, res) => {
    const { period } = req.query;

    const { viewsByType } = await profileAnalyticsService.getAnalyticsSummary(
      req.params.merchantId,
      period
    );

    res.status(200).json({
      status: 'success',
      data: { viewsByType }
    });
  });

  /**
   * Get viewer demographics
   * @route GET /api/merchants/profile/analytics/demographics
   */
  getViewerDemographics = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    const analytics = await profileAnalyticsService.getDetailedAnalytics(
      req.params.merchantId,
      {
        startDate,
        endDate,
        includeViewer: true
      }
    );

    // Process demographics
    const demographics = {
      authenticated: 0,
      anonymous: 0,
      deviceTypes: {},
      sources: {},
      locations: {}
    };

    analytics.forEach(view => {
      // Count authenticated vs anonymous
      if (view.viewer_id) {
        demographics.authenticated++;
      } else {
        demographics.anonymous++;
      }

      // Count device types
      demographics.deviceTypes[view.device_type] = 
        (demographics.deviceTypes[view.device_type] || 0) + 1;

      // Count sources
      demographics.sources[view.source] = 
        (demographics.sources[view.source] || 0) + 1;

      // Count locations if available
      if (view.location_data?.country) {
        demographics.locations[view.location_data.country] = 
          (demographics.locations[view.location_data.country] || 0) + 1;
      }
    });

    res.status(200).json({
      status: 'success',
      data: { demographics }
    });
  });

  /**
   * Get interaction metrics
   * @route GET /api/merchants/profile/analytics/interactions
   */
  getInteractionMetrics = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    const analytics = await profileAnalyticsService.getDetailedAnalytics(
      req.params.merchantId,
      { startDate, endDate }
    );

    // Calculate interaction metrics
    const metrics = {
      totalInteractions: 0,
      averageInteractionsPerView: 0,
      averageViewDuration: 0,
      interactionDistribution: {
        low: 0,    // 0-2 interactions
        medium: 0, // 3-5 interactions
        high: 0    // 6+ interactions
      }
    };

    analytics.forEach(view => {
      metrics.totalInteractions += view.interaction_count || 0;
      metrics.averageViewDuration += view.view_duration || 0;

      // Categorize interaction levels
      const interactions = view.interaction_count || 0;
      if (interactions <= 2) metrics.interactionDistribution.low++;
      else if (interactions <= 5) metrics.interactionDistribution.medium++;
      else metrics.interactionDistribution.high++;
    });

    if (analytics.length > 0) {
      metrics.averageInteractionsPerView = metrics.totalInteractions / analytics.length;
      metrics.averageViewDuration = metrics.averageViewDuration / analytics.length;
    }

    res.status(200).json({
      status: 'success',
      data: { metrics }
    });
  });
}

module.exports = new ProfileAnalyticsController();