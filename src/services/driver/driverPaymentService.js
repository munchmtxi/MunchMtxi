'use strict';

const { Payment, DriverEarnings, Driver } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const mathUtils = require('@utils/mathUtils');

/**
 * DriverPaymentService manages driver payments and earnings, including tips and payouts.
 */
class DriverPaymentService {
  /**
   * Adds a tip to a payment and updates driver earnings.
   * @param {number} paymentId - The ID of the payment to add a tip to.
   * @param {Object} tipData - Tip details { amount, percentage }.
   * @returns {Promise<Object>} Updated payment and earnings details.
   */
  async addTip(paymentId, tipData) {
    const { amount, percentage } = tipData;

    // Validate tip data
    if (typeof amount !== 'number' || amount < 0) {
      logger.warn('Invalid tip amount', { paymentId, amount });
      throw new AppError('Tip amount must be a positive number', 400);
    }

    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Driver, as: 'driver' }],
    });
    if (!payment) {
      logger.error('Payment not found for tip addition', { paymentId });
      throw new AppError('Payment not found', 404);
    }
    if (!payment.driver_id) {
      logger.warn('No driver associated with payment for tip', { paymentId });
      throw new AppError('No driver associated with this payment', 400);
    }
    if (payment.status !== 'verified' && payment.status !== 'completed') {
      logger.warn('Payment not in verifiable state for tip', { paymentId, status: payment.status });
      throw new AppError('Tip can only be added to verified or completed payments', 400);
    }

    // Calculate tip if percentage is provided
    let finalTipAmount = amount;
    if (percentage && typeof percentage === 'number' && percentage >= 0 && percentage <= 100) {
      finalTipAmount = mathUtils.roundToDecimal(
        mathUtils.calculatePercentage(percentage, payment.amount),
        2
      );
      logger.debug('Tip calculated from percentage', { paymentId, percentage, finalTipAmount });
    }

    const totalAmount = mathUtils.roundToDecimal(payment.amount + finalTipAmount, 2);

    // Update payment with tip
    await payment.update({
      tip_amount: finalTipAmount,
      amount: totalAmount,
      tip_allocation: {
        driver_percentage: 100, // Default: all tip goes to driver
        allocated_at: new Date(),
        total_tip: finalTipAmount,
        allocations: {
          driver_amount: finalTipAmount,
        },
      },
    });

    // Update driver earnings
    const earnings = await this.updateDriverEarnings(payment.driver_id, finalTipAmount, paymentId);

    logger.logTransactionEvent('Tip added and earnings updated', {
      paymentId,
      driverId: payment.driver_id,
      tipAmount: finalTipAmount,
      totalAmount,
    });

    return { payment, earnings };
  }

  /**
   * Updates a driver's total earnings.
   * @param {number} driverId - The ID of the driver.
   * @param {number} amount - The amount to add to earnings.
   * @param {number} paymentId - The associated payment ID.
   * @returns {Promise<Object>} Updated driver earnings record.
   */
  async updateDriverEarnings(driverId, amount, paymentId) {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      logger.error('Driver not found for earnings update', { driverId });
      throw new AppError('Driver not found', 404);
    }

    // Find or create earnings record for the driver
    let earnings = await DriverEarnings.findOne({ where: { driver_id: driverId } });
    if (!earnings) {
      earnings = await DriverEarnings.create({
        driver_id: driverId,
        total_earned: 0.00,
      });
      logger.info('New earnings record created', { driverId });
    }

    const newTotalEarned = mathUtils.roundToDecimal(parseFloat(earnings.total_earned) + amount, 2);
    await earnings.update({ total_earned: newTotalEarned });

    logger.logTransactionEvent('Driver earnings updated', {
      driverId,
      paymentId,
      amountAdded: amount,
      newTotalEarned,
    });

    return earnings;
  }

  /**
   * Retrieves a driver's total earnings.
   * @param {number} driverId - The ID of the driver.
   * @returns {Promise<Object>} Driver earnings record.
   */
  async getDriverEarnings(driverId) {
    const earnings = await DriverEarnings.findOne({
      where: { driver_id: driverId },
      include: [{ model: Driver, as: 'driver', attributes: ['id', 'name'] }],
    });
    if (!earnings) {
      logger.warn('No earnings record found for driver', { driverId });
      throw new AppError('No earnings record found for this driver', 404);
    }

    logger.info('Driver earnings retrieved', { driverId, totalEarned: earnings.total_earned });
    return earnings;
  }

  /**
   * Processes a payout to a driver (placeholder for actual payout logic).
   * @param {number} driverId - The ID of the driver.
   * @param {number} amount - The amount to pay out.
   * @returns {Promise<Object>} Payout confirmation.
   */
  async processPayout(driverId, amount) {
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      logger.error('Driver not found for payout', { driverId });
      throw new AppError('Driver not found', 404);
    }

    const earnings = await DriverEarnings.findOne({ where: { driver_id: driverId } });
    if (!earnings || earnings.total_earned < amount) {
      logger.warn('Insufficient earnings for payout', { driverId, amount, totalEarned: earnings?.total_earned });
      throw new AppError('Insufficient earnings for payout', 400);
    }

    // Placeholder for actual payout logic (e.g., bank transfer, mobile money)
    const payoutDetails = {
      driverId,
      amount,
      status: 'completed', // Simulated success
      transactionId: `PAY-${Date.now()}-${driverId}`,
      processedAt: new Date(),
    };

    // Deduct from earnings
    const newTotalEarned = mathUtils.roundToDecimal(earnings.total_earned - amount, 2);
    await earnings.update({ total_earned: newTotalEarned });

    logger.logTransactionEvent('Payout processed', {
      ...payoutDetails,
      newTotalEarned,
    });

    return payoutDetails;
  }
}

module.exports = new DriverPaymentService();