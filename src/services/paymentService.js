// src/services/paymentService.js
const { Payment } = require('../models');
const { Op } = require('sequelize');
const { PAYMENT_CONSTANTS } = require('../config/constants');
const AppError = require('../utils/AppError');

class PaymentService {
  async validateTransactionLimits(customerId, amount, paymentType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTransactions = await Payment.sum('amount', {
      where: {
        customer_id: customerId,
        created_at: {
          [Op.gte]: today
        },
        status: {
          [Op.in]: ['completed', 'processing', 'verified']
        }
      }
    });

    const limits = paymentType === 'MOBILE_MONEY' 
      ? PAYMENT_CONSTANTS.LIMITS.MOBILE_MONEY 
      : PAYMENT_CONSTANTS.LIMITS.BANK_CARD;

    if (dailyTransactions + amount > limits.DAILY_MAX) {
      throw new AppError('Daily transaction limit exceeded', 400);
    }

    if (amount > limits.TRANSACTION_MAX) {
      throw new AppError('Transaction amount exceeds limit', 400);
    }
  }

  async initiateMobileMoneyPayment(data) {
    const { 
      amount, 
      provider, 
      customer_id, 
      order_id, 
      merchant_id,
      phone_number 
    } = data;

    await this.validateTransactionLimits(customer_id, amount, 'MOBILE_MONEY');

    const payment = await Payment.create({
      amount,
      customer_id,
      order_id,
      merchant_id,
      payment_method: 'MOBILE_MONEY',
      provider,
      status: 'pending',
      payment_details: {
        phone_number,
        provider_specific: {} // Will store provider-specific details
      }
    });

    return payment;
  }

  async initiateBankCardPayment(data) {
    const { 
      amount, 
      customer_id, 
      order_id, 
      merchant_id,
      bank_name,
      card_details
    } = data;

    await this.validateTransactionLimits(customer_id, amount, 'BANK_CARD');

    const payment = await Payment.create({
      amount,
      customer_id,
      order_id,
      merchant_id,
      payment_method: 'BANK_CARD',
      provider: bank_name,
      status: 'pending',
      payment_details: {
        card_details,
        provider_specific: {} // Will store bank-specific details
      }
    });

    return payment;
  }

  async verifyBankPayment(paymentId, bankReference) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);

    return await payment.update({
      status: 'verified',
      bank_reference: bankReference,
      payment_details: {
        ...payment.payment_details,
        verification_time: new Date(),
        bank_reference: bankReference
      }
    });
  }

  async getPaymentStatus(paymentId) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
  }

  async updatePaymentStatus(paymentId, status, transactionDetails = {}) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);

    const updatedPayment = await payment.update({
      status,
      transaction_id: transactionDetails.transaction_id || payment.transaction_id,
      bank_reference: transactionDetails.bank_reference || payment.bank_reference,
      payment_details: {
        ...payment.payment_details,
        ...transactionDetails
      }
    });

    return updatedPayment;
  }
}

module.exports = new PaymentService();