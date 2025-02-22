// src/validators/merchantValidators/profileValidators/profileAnalyticsValidator.js
const { body, query, param, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

class ProfileAnalyticsValidator {
  /**
   * Validate view recording request
   */
  validateRecordView = [
    body('source')
      .optional()
      .isString()
      .isIn(['direct', 'search', 'referral', 'social', 'email', 'advertisement'])
      .withMessage('Invalid source type'),

    body('deviceType')
      .isString()
      .notEmpty()
      .isIn(['mobile', 'tablet', 'desktop', 'other'])
      .withMessage('Invalid device type'),

    body('sessionId')
      .optional()
      .isUUID(4)
      .withMessage('Invalid session ID format'),

    body('viewType')
      .optional()
      .isString()
      .isIn(['profile', 'menu', 'reviews', 'photos'])
      .withMessage('Invalid view type'),

    body('locationData')
      .optional()
      .isObject()
      .custom(this.validateLocationData)
      .withMessage('Invalid location data format'),

    this.handleValidationResult
  ];

  /**
   * Validate view analytics update
   */
  validateUpdateView = [
    param('sessionId')
      .isUUID(4)
      .withMessage('Invalid session ID format'),

    body('viewDuration')
      .optional()
      .isInt({ min: 0 })
      .withMessage('View duration must be a positive number'),

    body('interactionCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Interaction count must be a positive number'),

    this.handleValidationResult
  ];

  /**
   * Validate analytics summary request
   */
  validateAnalyticsSummary = [
    param('merchantId')
      .isInt()
      .withMessage('Invalid merchant ID'),

    query('period')
      .optional()
      .isString()
      .isIn(['1h', '24h', '7d', '30d'])
      .withMessage('Invalid period. Must be one of: 1h, 24h, 7d, 30d'),

    this.handleValidationResult
  ];

  /**
   * Validate detailed analytics request
   */
  validateDetailedAnalytics = [
    param('merchantId')
      .isInt()
      .withMessage('Invalid merchant ID'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate) {
          const start = new Date(req.query.startDate);
          const end = new Date(endDate);
          if (end < start) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),

    query('viewType')
      .optional()
      .isString()
      .isIn(['profile', 'menu', 'reviews', 'photos'])
      .withMessage('Invalid view type'),

    query('source')
      .optional()
      .isString()
      .isIn(['direct', 'search', 'referral', 'social', 'email', 'advertisement'])
      .withMessage('Invalid source type'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive number'),

    this.handleValidationResult
  ];

  /**
   * Validate demographics request
   */
  validateDemographics = [
    param('merchantId')
      .isInt()
      .withMessage('Invalid merchant ID'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate) {
          const start = new Date(req.query.startDate);
          const end = new Date(endDate);
          if (end < start) {
            throw new Error('End date must be after start date');
          }
          // Check if date range is within allowed limit (e.g., 90 days)
          const daysDiff = Math.abs(end - start) / (1000 * 60 * 60 * 24);
          if (daysDiff > 90) {
            throw new Error('Date range cannot exceed 90 days');
          }
        }
        return true;
      }),

    this.handleValidationResult
  ];

  /**
   * Validate interactions metrics request
   */
  validateInteractionMetrics = [
    param('merchantId')
      .isInt()
      .withMessage('Invalid merchant ID'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate) {
          const start = new Date(req.query.startDate);
          const end = new Date(endDate);
          if (end < start) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),

    this.handleValidationResult
  ];

  /**
   * Validate active viewers request
   */
  validateActiveViewers = [
    param('merchantId')
      .isInt()
      .withMessage('Invalid merchant ID'),

    this.handleValidationResult
  ];

  /**
   * Custom location data validator
   */
  validateLocationData(locationData) {
    if (!locationData || typeof locationData !== 'object') {
      return false;
    }

    // Required fields
    const requiredFields = ['country'];
    for (const field of requiredFields) {
      if (!(field in locationData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Optional fields validation
    if ('latitude' in locationData) {
      if (typeof locationData.latitude !== 'number' ||
          locationData.latitude < -90 ||
          locationData.latitude > 90) {
        throw new Error('Invalid latitude value');
      }
    }

    if ('longitude' in locationData) {
      if (typeof locationData.longitude !== 'number' ||
          locationData.longitude < -180 ||
          locationData.longitude > 180) {
        throw new Error('Invalid longitude value');
      }
    }

    if ('city' in locationData && typeof locationData.city !== 'string') {
      throw new Error('City must be a string');
    }

    if ('region' in locationData && typeof locationData.region !== 'string') {
      throw new Error('Region must be a string');
    }

    return true;
  }

  /**
   * Handle validation result
   */
  handleValidationResult(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(
        'Validation Error',
        400,
        'VALIDATION_ERROR',
        errors.array()
      ));
    }
    next();
  }
}

module.exports = new ProfileAnalyticsValidator();