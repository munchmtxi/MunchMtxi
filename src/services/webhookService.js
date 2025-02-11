// src/services/webhookService.js
const { Payment } = require('../models');
const { PAYMENT_CONSTANTS } = require('../config/constants');
const notificationService = require('./notificationService');
const eventManager = require('./eventManager');

class WebhookService {
  async handleMobileMoneyWebhook(data) {
    const { transaction_id, status, payment_id } = data;
    
    const payment = await Payment.findOne({
      where: { transaction_id: payment_id }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const updatedPayment = await payment.update({
      status: this.mapProviderStatus(status),
      payment_details: {
        ...payment.payment_details,
        webhook_data: data
      }
    });

    // Emit event for real-time updates
    eventManager.emit('payment.updated', {
      payment: updatedPayment,
      customerId: payment.customer_id
    });

    // Send notification
    await this.sendPaymentNotification(updatedPayment);
  }

  async handleBankWebhook(data) {
    const { bank_reference, status, payment_id } = data;
    
    const payment = await Payment.findOne({
      where: { bank_reference }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const updatedPayment = await payment.update({
      status: this.mapProviderStatus(status),
      payment_details: {
        ...payment.payment_details,
        webhook_data: data
      }
    });

    eventManager.emit('payment.updated', {
      payment: updatedPayment,
      customerId: payment.customer_id
    });

    await this.sendPaymentNotification(updatedPayment);
  }

  mapProviderStatus(providerStatus) {
    // Map provider-specific statuses to your system statuses
    const statusMap = {
      'SUCCESS': 'completed',
      'FAILED': 'failed',
      'PENDING': 'processing',
      // Add more mappings as needed
    };
    return statusMap[providerStatus] || 'pending';
  }

  async sendPaymentNotification(payment) {
    const notificationData = {
      type: 'PAYMENT_UPDATE',
      recipient: {
        customer_id: payment.customer_id
      },
      data: {
        payment_id: payment.id,
        status: payment.status,
        amount: payment.amount,
        payment_method: payment.payment_method
      }
    };

    await notificationService.sendNotification(notificationData);
  }
}

module.exports = new WebhookService();