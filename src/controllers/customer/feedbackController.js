'use strict';

const catchAsync = require('@utils/catchAsync');
const OrderService = require('@services/customer/orderService');
const InDiningOrderService = require('@services/customer/inDiningOrderService');
const bookingService = require('@services/customer/bookingService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const feedbackController = {
  submitFeedback: catchAsync(async (req, res) => {
    const { order_id, in_dining_order_id, booking_id, staff_id, rating, comment } = req.body;
    const customerId = req.user.customer_id || req.user.id; // Adjust based on your auth middleware

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
    }
    if (!staff_id) {
      throw new AppError('Staff ID is required', 400, 'MISSING_STAFF_ID');
    }
    if (!(order_id || in_dining_order_id || booking_id)) {
      throw new AppError('At least one of order_id, in_dining_order_id, or booking_id is required', 400, 'MISSING_REFERENCE');
    }

    let feedback;
    if (order_id) {
      feedback = await OrderService.submitFeedback(order_id, customerId, staff_id, rating, comment);
    } else if (in_dining_order_id) {
      const inDiningOrderService = new InDiningOrderService(req.io); // Assumes io is passed via req
      feedback = await inDiningOrderService.submitFeedback(in_dining_order_id, customerId, staff_id, rating, comment);
    } else if (booking_id) {
      feedback = await bookingService.submitFeedback(booking_id, customerId, staff_id, rating, comment);
    }

    logger.info('Feedback submitted', { customerId, staff_id, rating });

    res.status(201).json({
      status: 'success',
      message: 'Feedback submitted successfully',
      data: {
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        is_positive: feedback.is_positive,
      },
    });
  }),
};

module.exports = feedbackController;