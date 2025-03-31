'use strict';
const {
  InDiningOrder,
  OrderItems,
  MenuInventory,
  Payment,
  Notification,
  Customer,
  MerchantBranch,
  Table,
  ProductRecommendationAnalytics,
  User,
} = require('@models');
const { Op } = require('sequelize');
const PaymentService = require('@services/common/paymentService');
const NotificationService = require('@services/notifications/core/notificationService');
const FriendService = require('@services/customer/friendService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class InDiningOrderService {
  constructor(io) {
    this.io = io;
    this.notificationService = new NotificationService(io);
    this.friendService = new FriendService(io);
  }

  async addItem(orderId, customerId, items) {
    return await InDiningOrder.sequelize.transaction(async (t) => {
      const order = await InDiningOrder.findByPk(orderId, {
        include: [{ model: OrderItems, as: 'orderItems' }, { model: Table, as: 'table' }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!order) throw new AppError('In-dining order not found', 404);
      if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
      if (order.status === 'closed') throw new AppError('Order already closed', 400);

      const menuItems = await MenuInventory.findAll({
        where: {
          id: items.map((item) => item.menu_item_id),
          is_published: true,
          availability_status: 'in-stock',
        },
        transaction: t,
      });
      if (menuItems.length !== items.length) {
        throw new AppError('Some menu items are invalid or unavailable', 400);
      }

      const newItems = items.map((item) => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity || 1,
        customization: item.customization || {},
      }));

      const createdItems = await OrderItems.bulkCreate(newItems, { transaction: t });
      const totalAmount = await this.calculateTotalAmount(orderId, t);
      await order.update({ total_amount: totalAmount }, { transaction: t });

      await this.sendNotification(order, 'Item added to your order', t);
      this.io.to(`order:${orderId}`).emit('orderUpdated', { orderId, items: createdItems });

      if (items.some((item) => item.source === 'recommendation')) {
        await this.logRecommendationAnalytics(order, items, t);
      }

      return { order, newItems: createdItems };
    }).catch((err) => {
      logger.error('Error in addItem:', err);
      throw err instanceof AppError ? err : new AppError('Failed to add items to order', 500);
    });
  }

  async updateOrder(orderId, customerId, updates) {
    return await InDiningOrder.sequelize.transaction(async (t) => {
      const order = await InDiningOrder.findByPk(orderId, {
        include: [{ model: OrderItems, as: 'orderItems' }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!order) throw new AppError('In-dining order not found', 404);
      if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
      if (order.status === 'closed') throw new AppError('Order already closed', 400);

      if (updates.items) {
        for (const item of updates.items) {
          const orderItem = order.orderItems.find((oi) => oi.menu_item_id === item.menu_item_id);
          if (orderItem) {
            await orderItem.update({ quantity: item.quantity }, { transaction: t });
          }
        }
      }
      if (updates.notes) {
        await order.update({ notes: updates.notes }, { transaction: t });
      }

      const totalAmount = await this.calculateTotalAmount(orderId, t);
      await order.update({ total_amount: totalAmount }, { transaction: t });

      await this.sendNotification(order, 'Order updated', t);
      this.io.to(`order:${orderId}`).emit('orderUpdated', { orderId, total_amount: totalAmount });
      return order;
    }).catch((err) => {
      logger.error('Error in updateOrder:', err);
      throw err instanceof AppError ? err : new AppError('Failed to update order', 500);
    });
  }

  async closeOrder(orderId, customerId) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: MerchantBranch, as: 'branch' }],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
    if (order.status === 'closed') throw new AppError('Order already closed', 400);

    await order.update({ status: 'closed' });
    await Table.update({ status: 'available' }, { where: { id: order.table_id } });

    await this.sendNotification(order, 'Order closed - please proceed to payment');
    return order;
  }

  async getOrderStatus(orderId, customerId) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [
        { model: OrderItems, as: 'orderItems', include: [{ model: MenuInventory, as: 'menuItem' }] },
        { model: Table, as: 'table' },
      ],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);

    const eta = await this.calculateETA(order);
    return { order, estimated_completion_time: eta };
  }

  async payOrder(orderId, customerId, paymentData) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: MerchantBranch, as: 'branch' }],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
    if (order.payment_status !== 'unpaid') throw new AppError('Order already paid', 400);

    const paymentMethod = paymentData.payment_method;
    const merchantId = order.branch.merchant_id;

    let payment;
    if (paymentMethod === 'MOBILE_MONEY') {
      payment = await PaymentService.initiateMobileMoneyPayment({
        amount: order.total_amount,
        provider: paymentData.provider,
        customer_id: customerId,
        order_id: orderId,
        merchant_id: merchantId,
        phone_number: paymentData.phone_number,
      });
    } else if (paymentMethod === 'BANK_CARD') {
      payment = await PaymentService.initiateBankCardPayment({
        amount: order.total_amount,
        customer_id: customerId,
        order_id: orderId,
        merchant_id: merchantId,
        bank_name: paymentData.bank_name,
        card_details: paymentData.card_details,
      });
    } else {
      throw new AppError('Unsupported payment method', 400);
    }

    if (paymentData.tip_amount) {
      await PaymentService.addTip(payment.id, { amount: paymentData.tip_amount });
    }

    await order.update({ payment_status: 'paid' });
    await this.sendNotification(order, 'Payment successful');
    return payment;
  }

  async addTip(orderId, customerId, tipData) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: Payment, as: 'payment' }],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
    if (!order.payment) throw new AppError('No payment found for this order', 400);
    if (order.payment_status !== 'paid') throw new AppError('Order must be paid to add a tip', 400);

    const payment = await PaymentService.addTip(order.payment.id, {
      amount: tipData.amount,
      allocation: tipData.allocation,
    });

    await this.sendNotification(order, `Tip of ${tipData.amount} ${order.currency} added`);
    logger.info('Tip added to in-dining order', { orderId, customerId, tipAmount: tipData.amount });
    return payment;
  }

  async getActiveBookingSession(orderId, customerId) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [
        { model: OrderItems, as: 'orderItems', include: [{ model: MenuInventory, as: 'menuItem' }] },
        { model: Table, as: 'table' },
        { model: MerchantBranch, as: 'branch' },
        { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      ],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
    if (order.status === 'closed') throw new AppError('Order is closed', 400);

    const activeOrders = await InDiningOrder.findAll({
      where: {
        branch_id: order.branch_id,
        table_id: order.table_id,
        status: { [Op.ne]: 'closed' },
        customer_id: { [Op.ne]: customerId },
      },
      include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] }],
    });

    const activeUsers = activeOrders.map((o) => ({
      userId: o.customer.user.id,
      fullName: o.customer.user.getFullName(),
      customerId: o.customer.id,
      orderId: o.id,
    }));

    const sessionData = {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        items: order.orderItems.map((item) => ({
          name: item.menuItem.name,
          quantity: item.quantity,
          customization: item.customization,
          price: item.menuItem.calculateFinalPrice(),
        })),
        total_amount: order.total_amount,
        currency: order.currency,
        status: order.status,
        preparation_status: order.preparation_status,
        estimated_completion_time: await this.calculateETA(order),
      },
      activeUsers,
    };

    return sessionData;
  }

  async addFriend(orderId, customerId, friendUserId) {
    const order = await InDiningOrder.findByPk(orderId, {
      include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] }],
    });
    if (!order) throw new AppError('In-dining order not found', 404);
    if (order.customer_id !== customerId) throw new AppError('Unauthorized', 403);
    if (order.status === 'closed') throw new AppError('Order is closed', 400);

    const friendOrder = await InDiningOrder.findOne({
      where: {
        branch_id: order.branch_id,
        table_id: order.table_id,
        status: { [Op.ne]: 'closed' },
      },
      include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user', where: { id: friendUserId } }] }],
    });
    if (!friendOrder) throw new AppError('Friend is not part of an active session here', 400);

    const userId = order.customer.user.id;
    const connection = await this.friendService.sendFriendRequest(userId, friendUserId);
    await this.sendNotification(order, `You sent a friend request to ${friendOrder.customer.user.getFullName()}`);
    logger.info('Friend added from in-dining session', { customerId, friendUserId });
    return connection;
  }

  async calculateTotalAmount(orderId, transaction = null) {
    const items = await OrderItems.findAll({
      where: { order_id: orderId },
      include: [{ model: MenuInventory, as: 'menuItem' }],
      transaction,
    });
    return items.reduce((total, item) => total + item.menuItem.calculateFinalPrice() * item.quantity, 0);
  }

  async sendNotification(order, message, transaction = null) {
    const customer = await Customer.findByPk(order.customer_id, { transaction });
    const notification = await Notification.create(
      {
        user_id: customer.user_id,
        order_id: order.id,
        type: 'ORDER_UPDATE',
        message,
        priority: 'MEDIUM',
      },
      { transaction }
    );

    await this.notificationService.sendThroughChannel(
      'WHATSAPP',
      {
        notification: { templateName: 'order_update', parameters: { message } },
        content: message,
        recipient: customer.format_phone_for_whatsapp(),
      },
      transaction
    );
  }

  async calculateETA(order) {
    const items = await OrderItems.findAll({
      where: { order_id: order.id },
      include: [{ model: MenuInventory, as: 'menuItem' }],
    });
    const maxPrepTime = Math.max(...items.map((item) => item.menuItem.preparation_time_minutes || 0));
    return new Date(Date.now() + maxPrepTime * 60000); // Convert minutes to milliseconds
  }

  async logRecommendationAnalytics(order, items, transaction = null) {
    const recommendations = items.filter((item) => item.source === 'recommendation');
    for (const item of recommendations) {
      await ProductRecommendationAnalytics.create(
        {
          merchant_id: order.branch.merchant_id,
          product_id: item.menu_item_id,
          customer_id: order.customer_id,
          recommendation_type: 'personalized',
          event_type: 'add-to-cart',
          source_product_id: item.source_product_id,
        },
        { transaction }
      );
    }
  }

  async getRecommendations(customerId, branchId) {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || !branch.table_management_enabled) {
      throw new AppError('Branch does not support in-dining', 400);
    }
    const pastOrders = await InDiningOrder.findAll({
      where: { customer_id: customerId },
      include: [{ model: OrderItems, as: 'orderItems' }],
    });
    const menuItems = await MenuInventory.findAll({
      where: { branch_id: branchId, is_published: true },
    });
    const orderedItemIds = pastOrders.flatMap((o) => o.orderItems.map((oi) => oi.menu_item_id));
    return menuItems.filter((item) => !orderedItemIds.includes(item.id)).slice(0, 3);
  }

  async setupInDiningOrder() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to in-dining namespace');

      socket.on('joinOrder', (orderId) => {
        socket.join(`order:${orderId}`);
        logger.info(`Client joined order room: ${orderId}`);
      });

      socket.on('leaveOrder', (orderId) => {
        socket.leave(`order:${orderId}`);
        logger.info(`Client left order room: ${orderId}`);
      });

      socket.on('requestOrderStatus', async (data) => {
        try {
          const { orderId, customerId } = data;
          const status = await this.getOrderStatus(orderId, customerId);
          socket.emit('orderStatus', status);
        } catch (error) {
          socket.emit('error', { message: error.message, status: error.status || 500 });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from in-dining namespace');
      });
    });
  }
}

module.exports = InDiningOrderService;