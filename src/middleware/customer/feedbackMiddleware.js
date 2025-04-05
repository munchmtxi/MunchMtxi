'use strict';

const AppError = require('@utils/AppError');

const feedbackMiddleware = {
  validateFeedbackBody: (req, res, next) => {
    const { order_id, in_dining_order_id, booking_id, staff_id, rating } = req.body;

    if (!(order_id || in_dining_order_id || booking_id)) {
      return next(new AppError('At least one of order_id, in_dining_order_id, or booking_id is required', 400, 'MISSING_REFERENCE'));
    }
    if (!staff_id) {
      return next(new AppError('Staff ID is required', 400, 'MISSING_STAFF_ID'));
    }
    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING'));
    }

    next();
  },
};

module.exports = feedbackMiddleware;