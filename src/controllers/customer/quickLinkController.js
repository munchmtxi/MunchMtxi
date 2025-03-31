'use strict';

const catchAsync = require('@utils/catchAsync');
const QuickLinkService = require('@services/customer/quickLinkService');
const { logApiEvent } = require('@utils/logger');
const AppError = require('@utils/AppError');

const quickLinkService = QuickLinkService; // Use the imported instance directly

module.exports = {
  /**
   * Handle customer check-in request
   * @route POST /api/customer/quicklink/check-in
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  checkIn: catchAsync(async (req, res, next) => {
    const { user_id, booking_id } = req.body;

    if (!user_id || !booking_id) {
      throw new AppError('user_id and booking_id are required', 400, 'MISSING_FIELDS');
    }

    const { booking, waitTimeEstimate } = await quickLinkService.checkIn(user_id, booking_id);

    res.status(200).json({
      status: 'success',
      message: 'Checked in successfully',
      data: {
        booking: {
          id: booking.id,
          reference: booking.reference,
          table_number: booking.table.table_number,
          status: booking.status,
          arrived_at: booking.arrived_at,
        },
        waitTimeEstimate,
      },
    });
  }),

  /**
   * Handle staff assistance request
   * @route POST /api/customer/quicklink/call-staff
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  callStaff: catchAsync(async (req, res, next) => {
    const { user_id, table_id, request_type } = req.body;

    if (!user_id || !table_id || !request_type) {
      throw new AppError('user_id, table_id, and request_type are required', 400, 'MISSING_FIELDS');
    }

    const validRequestTypes = ['assistance', 'order', 'emergency'];
    if (!validRequestTypes.includes(request_type)) {
      throw new AppError('Invalid request_type. Must be assistance, order, or emergency', 400, 'INVALID_REQUEST_TYPE');
    }

    const { notification } = await quickLinkService.callStaff(user_id, table_id, request_type);

    res.status(200).json({
      status: 'success',
      message: 'Staff notified successfully',
      data: {
        notification: {
          id: notification.id,
          message: notification.message,
          priority: notification.priority,
        },
      },
    });
  }),

  /**
   * Handle bill request for an in-dining order
   * @route POST /api/customer/quicklink/request-bill
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  requestBill: catchAsync(async (req, res, next) => {
    const { user_id, in_dining_order_id, payment_method, split_with } = req.body;

    if (!user_id || !in_dining_order_id || !payment_method) {
      throw new AppError('user_id, in_dining_order_id, and payment_method are required', 400, 'MISSING_FIELDS');
    }

    if (!payment_method.type || !payment_method.provider) {
      throw new AppError('payment_method must include type and provider', 400, 'INVALID_PAYMENT_METHOD');
    }

    const validPaymentTypes = ['MOBILE_MONEY', 'BANK_CARD'];
    if (!validPaymentTypes.includes(payment_method.type)) {
      throw new AppError('Invalid payment_method.type. Must be MOBILE_MONEY or BANK_CARD', 400, 'INVALID_PAYMENT_TYPE');
    }

    const { payment } = await quickLinkService.requestBill(
      user_id,
      in_dining_order_id,
      payment_method,
      split_with || []
    );

    res.status(200).json({
      status: 'success',
      message: 'Bill requested successfully',
      data: {
        payment: Array.isArray(payment)
          ? payment.map(p => ({
              id: p.id,
              amount: p.amount,
              customer_id: p.customer_id,
              status: p.status,
            }))
          : {
              id: payment.id,
              amount: payment.amount,
              customer_id: payment.customer_id,
              status: payment.status,
            },
      },
    });
  }),
};