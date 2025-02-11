// src/services/paymentService.js
const { Payment, Customer } = require('../models');
const { Op } = require('sequelize');
const { PAYMENT_CONSTANTS } = require('../config/constants');
const AppError = require('../utils/AppError');
const RiskAssessmentService = require('./riskAssessmentService');
const { logTransactionEvent } = require('../utils/logger');

class PaymentService {
  // Validate transaction limits for a customer
  async validateTransactionLimits(customerId, amount, paymentType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyTransactions = await Payment.sum('amount', {
      where: {
        customer_id: customerId,
        created_at: {
          [Op.gte]: today,
        },
        status: {
          [Op.in]: ['completed', 'processing', 'verified'],
        },
      },
    });
    const limits =
      paymentType === 'MOBILE_MONEY'
        ? PAYMENT_CONSTANTS.LIMITS.MOBILE_MONEY
        : PAYMENT_CONSTANTS.LIMITS.BANK_CARD;
    if (dailyTransactions + amount > limits.DAILY_MAX) {
      throw new AppError('Daily transaction limit exceeded', 400);
    }
    if (amount > limits.TRANSACTION_MAX) {
      throw new AppError('Transaction amount exceeds limit', 400);
    }
  }

  // Initiate a mobile money payment
  async initiateMobileMoneyPayment(data) {
    const {
      amount,
      provider,
      customer_id,
      order_id,
      merchant_id,
      phone_number,
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
        provider_specific: {}, // Will store provider-specific details
      },
    });
    return payment;
  }

  // Initiate a bank card payment
  async initiateBankCardPayment(data) {
    const {
      amount,
      customer_id,
      order_id,
      merchant_id,
      bank_name,
      card_details,
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
        provider_specific: {}, // Will store bank-specific details
      },
    });
    return payment;
  }

  // Verify a bank payment
  async verifyBankPayment(paymentId, bankReference) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    return await payment.update({
      status: 'verified',
      bank_reference: bankReference,
      payment_details: {
        ...payment.payment_details,
        verification_time: new Date(),
        bank_reference: bankReference,
      },
    });
  }

  // Verify a payment and handle risk assessment
  async verifyPayment(paymentId) {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Customer, as: 'customer' }],
    });
    if (!payment) throw new AppError('Payment not found', 404);
    await payment.increment('verification_attempts');
    const { score, riskFactors } =
      await RiskAssessmentService.calculateRiskScore(payment, payment.customer);
    await payment.update({
      risk_score: score,
      risk_factors: riskFactors,
    });
    logTransactionEvent('Payment verification attempt', {
      payment_id: paymentId,
      risk_score: score,
      verification_attempt: payment.verification_attempts,
    });
    if (await RiskAssessmentService.requiresDelayedCapture(score)) {
      await payment.update({
        status: 'pending_review',
        verification_details: {
          delayed_capture: true,
          review_required: true,
          verification_time: new Date(),
        },
      });
      return { status: 'pending_review', requiresManualReview: true };
    }
    return this.processVerification(payment);
  }

  // Process normal verification flow
  async processVerification(payment) {
    return await payment.update({
      status: 'verified',
      payment_details: {
        ...payment.payment_details,
        verification_time: new Date(),
      },
    });
  }

  // Get payment status by ID
  async getPaymentStatus(paymentId) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
  }

  // Update payment status
  async updatePaymentStatus(paymentId, status, transactionDetails = {}) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    const updatedPayment = await payment.update({
      status,
      transaction_id: transactionDetails.transaction_id || payment.transaction_id,
      bank_reference: transactionDetails.bank_reference || payment.bank_reference,
      payment_details: {
        ...payment.payment_details,
        ...transactionDetails,
      },
    });
    return updatedPayment;
  }

  // Handle webhooks
  async handleWebhook(provider, webhookData) {
    const { payment_id, status, transaction_id } = webhookData;
    const payment = await Payment.findByPk(payment_id);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    const updatedPayment = await payment.update({
      status: status,
      transaction_id: transaction_id || payment.transaction_id,
      payment_details: {
        ...payment.payment_details,
        webhook_received: new Date(),
        webhook_data: webhookData,
      },
    });
    logTransactionEvent('Webhook received', {
      provider,
      payment_id,
      status,
      webhook_data: webhookData,
    });
    return updatedPayment;
  }

  // Initiate refund
  async initiateRefund(paymentId, refundData) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'refunded') {
      throw new AppError('Payment already refunded', 400);
    }
    await payment.update({
      refund_status: 'pending',
      refund_details: {
        reason: refundData.reason,
        requested_by: refundData.requested_by,
        requested_at: new Date(),
        amount: refundData.amount || payment.amount,
        notes: refundData.notes,
      },
    });
    logTransactionEvent('Refund initiated', {
      payment_id: paymentId,
      ...refundData,
    });
    return payment;
  }

  // Process refund
  async processRefund(paymentId, adminId, action, notes) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.refund_status !== 'pending') {
      throw new AppError('Refund not in pending status', 400);
    }
    const status = action === 'approve' ? 'approved' : 'rejected';
    const updatedDetails = {
      ...payment.refund_details,
      processed_by: adminId,
      processed_at: new Date(),
      status,
      admin_notes: notes,
    };
    await payment.update({
      refund_status: status,
      refund_details: updatedDetails,
      status: status === 'approved' ? 'refunded' : payment.status,
    });
    return payment;
  }

  // Add tip to a payment
  async addTip(paymentId, tipData) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    const totalAmount = payment.amount + tipData.amount;
    const tipAllocation = await this.calculateTipAllocation(payment, tipData);
    await payment.update({
      amount: totalAmount,
      tip_amount: tipData.amount,
      tip_allocation: tipAllocation,
    });
    return payment;
  }

  // Calculate tip allocation
  async calculateTipAllocation(payment, tipData) {
    const allocation = tipData.allocation || {};
    if (payment.driver_id && !allocation.driver_percentage) {
      allocation.driver_percentage = 100; // Default all to driver if it's a delivery
    }
    return {
      allocation_rules: allocation,
      allocated_at: new Date(),
      total_tip: tipData.amount,
      allocations: {
        driver_amount:
          tipData.amount * (allocation.driver_percentage || 0) / 100,
        staff_amount: tipData.amount * (allocation.staff_percentage || 0) / 100,
        // Add other allocations as needed
      },
    };
  }
}

module.exports = new PaymentService();