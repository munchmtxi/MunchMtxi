'use strict';

const { Op } = require('sequelize');
const cron = require('node-cron');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Subscription, Customer, MenuInventory, ProductDiscount, Merchant, Order, OrderItems, Payment } = require('@models');
const whatsappService = require('@services/common/whatsappService');
const emailService = require('@services/common/emailService');

// Assumed Subscription model (unchanged)
const subscriptionModelAttributes = {
  customer_id: 'Customer.id',
  menu_item_id: 'MenuInventory.id',
  merchant_id: 'Merchant.id',
  schedule: ['daily', 'weekly', 'monthly'],
  start_date: 'DATE',
  end_date: 'DATE',
  status: ['active', 'paused', 'canceled'],
  total_amount: 'DECIMAL(10, 2)',
};

class SubscriptionService {
  constructor() {
    this.scheduleSubscriptions();
  }

  // Schedule recurring orders based on active subscriptions
  async scheduleSubscriptions() {
    cron.schedule('0 0 * * *', async () => { // Runs daily at midnight
      try {
        const subscriptions = await Subscription.findAll({
          where: { status: 'active', deleted_at: null },
          include: [{ model: Customer }, { model: MenuInventory }, { model: Merchant }],
        });

        for (const sub of subscriptions) {
          await this.createRecurringOrder(sub);
        }
        logger.info('Scheduled subscription orders processed', { count: subscriptions.length });
      } catch (error) {
        logger.error('Error scheduling subscriptions:', error);
      }
    }, {
      timezone: config.time_zone || 'UTC',
    });
  }

  // Create a recurring order based on subscription
  async createRecurringOrder(subscription) {
    const now = new Date();
    const shouldCreateOrder = 
      (subscription.schedule === 'daily') ||
      (subscription.schedule === 'weekly' && now.getDay() === 1) || // Monday
      (subscription.schedule === 'monthly' && now.getDate() === 1);

    if (!shouldCreateOrder || (subscription.end_date && now > new Date(subscription.end_date))) {
      return;
    }

    const menuItem = await MenuInventory.findByPk(subscription.menu_item_id, {
      include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true } }],
    });

    if (!menuItem || menuItem.availability_status !== 'in-stock') {
      throw new AppError('Menu item unavailable', 400, 'MENU_ITEM_UNAVAILABLE');
    }

    const finalPrice = menuItem.calculateFinalPrice();
    const order = await Order.create({
      customer_id: subscription.customer_id,
      merchant_id: subscription.merchant_id,
      items: [{ menu_item_id: menuItem.id, quantity: 1 }],
      total_amount: finalPrice,
      order_number: `SUB-${subscription.id}-${Date.now()}`,
      status: 'pending',
      payment_status: 'unpaid',
      currency: 'MWK', // From Merchant or config
    });

    await OrderItems.create({
      order_id: order.id,
      menu_item_id: menuItem.id,
      quantity: 1,
    });

    await Payment.create({
      order_id: order.id,
      customer_id: subscription.customer_id,
      merchant_id: subscription.merchant_id,
      amount: finalPrice,
      payment_method: 'subscription',
      status: 'pending',
    });

    logger.info('Recurring order created', { subscriptionId: subscription.id, orderId: order.id });
    await this.notifyCustomer(subscription.customer_id, `Your subscription order #${order.order_number} has been placed!`);
  }

  // Create a new subscription
  async createSubscription(customerId, data) {
    const { menu_item_id, schedule, start_date, end_date } = data;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const menuItem = await MenuInventory.findByPk(menu_item_id, {
      include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true } }],
    });
    if (!menuItem || menuItem.availability_status !== 'in-stock') {
      throw new AppError('Menu item unavailable', 400, 'MENU_ITEM_UNAVAILABLE');
    }

    const merchant = await Merchant.findByPk(menuItem.merchant_id);
    if (!merchant || !merchant.is_active) {
      throw new AppError('Merchant not available', 400, 'MERCHANT_UNAVAILABLE');
    }

    const finalPrice = menuItem.calculateFinalPrice();
    const subscription = await Subscription.create({
      customer_id: customerId,
      menu_item_id,
      merchant_id: menuItem.merchant_id,
      schedule,
      start_date: start_date || new Date(),
      end_date,
      status: 'active',
      total_amount: finalPrice,
    });

    logger.info('Subscription created', { subscriptionId: subscription.id });
    await this.notifyCustomer(customerId, `Your subscription for ${menuItem.name} has been created!`);
    return subscription;
  }

  // Update an existing subscription
  async updateSubscription(subscriptionId, data) {
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [{ model: Customer }, { model: MenuInventory }],
    });
    if (!subscription || subscription.deleted_at) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const { menu_item_id, schedule, start_date, end_date, status } = data;

    if (menu_item_id && menu_item_id !== subscription.menu_item_id) {
      const menuItem = await MenuInventory.findByPk(menu_item_id, {
        include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true } }],
      });
      if (!menuItem || menuItem.availability_status !== 'in-stock') {
        throw new AppError('Menu item unavailable', 400, 'MENU_ITEM_UNAVAILABLE');
      }
      subscription.menu_item_id = menu_item_id;
      subscription.merchant_id = menuItem.merchant_id;
      subscription.total_amount = menuItem.calculateFinalPrice();
    }

    if (schedule) subscription.schedule = schedule;
    if (start_date) subscription.start_date = start_date;
    if (end_date) subscription.end_date = end_date;
    if (status) subscription.status = status;

    await subscription.save();
    logger.info('Subscription updated', { subscriptionId });
    await this.notifyCustomer(subscription.customer_id, `Your subscription for ${subscription.MenuInventory.name} has been updated!`);
    return subscription;
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId, reason) {
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription || subscription.deleted_at) {
      throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    subscription.status = 'canceled';
    await subscription.destroy(); // Soft delete
    logger.info('Subscription canceled', { subscriptionId, reason });

    await this.notifyCustomer(subscription.customer_id, `Your subscription has been canceled. Reason: ${reason}`);
    return { message: 'Subscription canceled successfully' };
  }

  async getSubscriptions(userId) { // Changed from customerId to userId for clarity
    // Find the customer record linked to the user
    const customer = await Customer.findOne({
      where: { user_id: userId },
    });
    if (!customer) {
      throw new AppError('Customer profile not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const subscriptions = await Subscription.findAll({
      where: { customer_id: customer.id, deleted_at: null },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'phone_number'] },
        { 
          model: MenuInventory, 
          as: 'menuItem', 
          include: [{ model: ProductDiscount, as: 'discounts', where: { is_active: true }, required: false }],
        },
        { model: Merchant, as: 'merchant', attributes: ['id', 'business_name'] },
      ],
    });

    if (!subscriptions.length) {
      throw new AppError('No subscriptions found', 404, 'NO_SUBSCRIPTIONS');
    }

    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      menuItem: sub.menuItem ? sub.menuItem.name : 'Unknown Item',
      merchant: sub.merchant ? sub.merchant.business_name : 'Unknown Merchant',
      schedule: sub.schedule,
      start_date: sub.start_date,
      end_date: sub.end_date,
      total_amount: sub.total_amount,
      status: sub.status,
      discount: sub.menuItem && sub.menuItem.discounts?.[0]?.name || 'None',
    }));

    logger.info('Subscriptions fetched', { userId, customerId: customer.id, count: subscriptions.length });
    return formattedSubscriptions;
  }

  // Notify customer via WhatsApp or email
  async notifyCustomer(customerId, message) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) return;

    try {
      const phone = customer.format_phone_for_whatsapp();
      await whatsappService.sendMessage(phone, message);
    } catch (error) {
      logger.warn('WhatsApp notification failed, falling back to email', { error });
      await emailService.sendEmail(customer.email || `${customer.phone_number}@example.com`, 'Subscription Update', message);
    }
  }
}

// Export both the class and a singleton instance
const subscriptionServiceInstance = new SubscriptionService();
module.exports = {
  SubscriptionService,           // Export the class
  subscriptionService: subscriptionServiceInstance // Export the singleton instance
};