'use strict';

const DriverPaymentService = require('@services/driver/driverPaymentService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * DriverPaymentController handles HTTP requests related to driver payments and earnings.
 */
const DriverPaymentController = {
  /**
   * Adds a tip to a payment and updates driver earnings.
   * @route POST /api/v1/driver/payments/:paymentId/tip
   */
  addTip: catchAsync(async (req, res, next) => {
    const { paymentId } = req.params;
    const { amount, percentage } = req.body;
    const driverId = req.driver.id; // Assumes driver ID from auth middleware

    logger.info('Request to add tip', { paymentId, driverId, amount, percentage });

    const { payment, earnings } = await DriverPaymentService.addTip(paymentId, {
      amount,
      percentage,
    });

    // Verify the driver matches the payment
    if (payment.driver_id !== driverId) {
      logger.warn('Driver not authorized to add tip to this payment', { driverId, paymentId });
      throw new AppError('You are not authorized to modify this payment', 403);
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment: {
          id: payment.id,
          amount: payment.amount,
          tip_amount: payment.tip_amount,
          status: payment.status,
        },
        earnings: {
          driver_id: earnings.driver_id,
          total_earned: earnings.total_earned,
        },
      },
    });
  }),

  /**
   * Retrieves a driver's total earnings.
   * @route GET /api/v1/driver/earnings
   */
  getEarnings: catchAsync(async (req, res, next) => {
    const driverId = req.driver.id; // Assumes driver ID from auth middleware

    logger.info('Request to retrieve driver earnings', { driverId });

    const earnings = await DriverPaymentService.getDriverEarnings(driverId);

    res.status(200).json({
      status: 'success',
      data: {
        earnings: {
          driver_id: earnings.driver_id,
          total_earned: earnings.total_earned,
          updated_at: earnings.updated_at,
        },
      },
    });
  }),

  /**
   * Processes a payout request for a driver.
   * @route POST /api/v1/driver/payout
   */
  requestPayout: catchAsync(async (req, res, next) => {
    const driverId = req.driver.id; // Assumes driver ID from auth middleware
    const { amount } = req.body;

    logger.info('Payout request received', { driverId, amount });

    if (typeof amount !== 'number' || amount <= 0) {
      logger.warn('Invalid payout amount', { driverId, amount });
      throw new AppError('Payout amount must be a positive number', 400);
    }

    const payout = await DriverPaymentService.processPayout(driverId, amount);

    res.status(200).json({
      status: 'success',
      data: {
        payout: {
          driver_id: payout.driverId,
          amount: payout.amount,
          transaction_id: payout.transactionId,
          status: payout.status,
          processed_at: payout.processedAt,
        },
      },
    });
  }),
};

module.exports = DriverPaymentController;