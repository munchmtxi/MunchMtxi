// src/validators/merchantValidators/profileValidators/performanceMetricsValidator.js
const { query, body, validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

const periodTypes = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];

class PerformanceMetricsValidator {
  /**
   * Validate general metrics request
   */
  validateMetricsRequest = [
    query('period_type')
      .optional()
      .isIn(periodTypes)
      .withMessage(`Period type must be one of: ${periodTypes.join(', ')}`),
    
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (req.query.start_date && endDate) {
          if (new Date(endDate) <= new Date(req.query.start_date)) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),

    this.handleValidationResult
  ];

  /**
   * Validate metrics comparison request
   */
  validateComparisonRequest = [
    query('period_type')
      .optional()
      .isIn(periodTypes)
      .withMessage(`Period type must be one of: ${periodTypes.join(', ')}`),
    
    query('current_start')
      .notEmpty()
      .withMessage('Current start date is required')
      .isISO8601()
      .withMessage('Current start date must be a valid ISO 8601 date'),
    
    query('previous_start')
      .notEmpty()
      .withMessage('Previous start date is required')
      .isISO8601()
      .withMessage('Previous start date must be a valid ISO 8601 date')
      .custom((previousStart, { req }) => {
        if (new Date(previousStart) >= new Date(req.query.current_start)) {
          throw new Error('Previous start date must be before current start date');
        }
        return true;
      }),

    this.handleValidationResult
  ];

  /**
   * Validate metrics recalculation request
   */
  validateRecalculationRequest = [
    body('period_type')
      .optional()
      .isIn(periodTypes)
      .withMessage(`Period type must be one of: ${periodTypes.join(', ')}`),
    
    body('start_date')
      .notEmpty()
      .withMessage('Start date is required')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    body('end_date')
      .notEmpty()
      .withMessage('End date is required')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (new Date(endDate) <= new Date(req.body.start_date)) {
          throw new Error('End date must be after start date');
        }
        const maxRange = 365; // days
        const daysDiff = Math.ceil(
          (new Date(endDate) - new Date(req.body.start_date)) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > maxRange) {
          throw new Error(`Date range cannot exceed ${maxRange} days`);
        }
        return true;
      }),

    this.handleValidationResult
  ];

  /**
   * Handle validation result
   */
  handleValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      return next(new AppError(
        'Validation Error',
        400,
        'VALIDATION_ERROR',
        errorMessages
      ));
    }
    next();
  };

  /**
   * Validate date format
   */
  isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  }
}

module.exports = new PerformanceMetricsValidator();