// src/services/customer/orderService.js
const { Op } = require('sequelize');
const uuid = require('uuid').v4;
const { Order, Cart, CartItem, Payment, Customer, Address, MerchantBranch, Driver, Route, Notification } = require('@models');
const AppError = require('@utils/AppError');
const mathUtils = require('@utils/mathUtils');
const { logger } = require('@utils/logger');
const NotificationService = require('@services/notifications/core/notificationService');
const paymentService = require('@services/common/paymentService');
const Geolocation2Service = require('@services/geoLocation/geolocation2Service');

class OrderService {
  static async checkout({ customer_id, payment_method, cart_id }) {
    const cart = await Cart.findByPk(cart_id, {
      include: [{ model: CartItem, include: ['MenuInventory'] }],
    });
    if (!cart || cart.customer_id !== customer_id) {
      throw new AppError('Invalid cart or customer', 400, 'INVALID_CART');
    }

    const customer = await Customer.findByPk(customer_id, { include: [Address] });
    const defaultAddress = customer.Addresses.find(addr => addr.id === customer.default_address_id);
    if (!defaultAddress) {
      throw new AppError('Customer address not found', 400, 'ADDRESS_NOT_FOUND');
    }

    const total_amount = mathUtils.roundToDecimal(
      mathUtils.sumArray(cart.CartItems.map(item => item.quantity * item.MenuInventory.price)),
      2
    );

    const merchantBranch = await this.findNearestMerchantBranch(defaultAddress.latitude, defaultAddress.longitude);
    if (!merchantBranch) {
      throw new AppError('No merchant available', 404, 'MERCHANT_UNAVAILABLE');
    }

    const order_number = `ORD-${uuid().split('-')[0]}`;
    const order = await Order.create({
      customer_id,
      merchant_id: merchantBranch.merchant_id,
      total_amount,
      order_number,
      status: 'pending',
      payment_status: 'unpaid',
      currency: customer.country === 'Malawi' ? 'MWK' : 'USD',
    });

    const orderItems = cart.CartItems.map(item => ({
      order_id: order.id,
      menu_inventory_id: item.menu_inventory_id,
      quantity: item.quantity,
      price: item.MenuInventory.price,
    }));
    await OrderItem.bulkCreate(orderItems);

    logger.info('Order created', { order_id: order.id, order_number, customer_id });

    const payment = await paymentService.processPayment({
      order_id: order.id,
      customer_id,
      merchant_id: merchantBranch.merchant_id,
      amount: total_amount,
      payment_method,
    });

    if (payment.status === 'completed') {
      await order.update({ payment_status: 'paid', status: 'confirmed' });
      logger.info('Order confirmed', { order_id: order.id, payment_status: 'paid' });

      await NotificationService.sendThroughChannel({
        user_id: customer.user_id,
        order_id: order.id,
        type: 'order_confirmation',
        message: `Your order #${order_number} has been confirmed!`,
        priority: 'MEDIUM',
        channel: customer.preferences?.notification_channel || 'EMAIL',
      });
    } else {
      throw new AppError('Payment failed', 402, 'PAYMENT_FAILED');
    }

    return { order_id: order.id, order_number, status: order.status, total_amount };
  }

  static async findNearestMerchantBranch(latitude, longitude) {
    const branches = await MerchantBranch.findAll({
      where: { status: 'active' },
      attributes: ['id', 'merchant_id', 'latitude', 'longitude', 'delivery_radius'],
    });

    let nearestBranch = null;
    let minDistance = Infinity;

    for (const branch of branches) {
      const distance = mathUtils.calculateDistance(
        latitude,
        longitude,
        branch.latitude,
        branch.longitude
      );
      if (distance < branch.delivery_radius && distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }

    return nearestBranch;
  }

  static async notifyMerchant(order_id) {
    const order = await Order.findByPk(order_id, { include: [MerchantBranch] });
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

    await order.update({ status: 'preparing' });
    logger.info('Order assigned to merchant', { order_id, merchant_id: order.merchant_id });

    await NotificationService.sendThroughChannel({
      user_id: order.MerchantBranch.merchant.user_id,
      order_id,
      type: 'new_order',
      message: `New order #${order.order_number} received at ${order.MerchantBranch.name}.`,
      priority: 'HIGH',
      channel: 'WHATSAPP',
    });

    return { order_id, merchant_id: order.merchant_id, status: order.status };
  }

  static async confirmOrderReady(order_id) {
    const order = await Order.findByPk(order_id);
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

    await order.update({ status: 'ready' });
    logger.info('Order marked as ready', { order_id });

    await NotificationService.sendThroughChannel({
      user_id: order.customer.user_id,
      order_id,
      type: 'order_ready',
      message: `Your order #${order.order_number} is ready for pickup!`,
      priority: 'MEDIUM',
    });

    return { order_id, status: order.status };
  }

  static async assignDriver(order_id) {
    const order = await Order.findByPk(order_id, {
      include: [MerchantBranch, { model: Address, as: 'delivery_address' }],
    });
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

    const driver = await this.findNearestAvailableDriver(
      order.MerchantBranch.latitude,
      order.MerchantBranch.longitude
    );
    if (!driver) throw new AppError('No drivers available', 404, 'DRIVER_UNAVAILABLE');

    const origin = `${order.MerchantBranch.latitude},${order.MerchantBranch.longitude}`;
    const destination = `${order.delivery_address.latitude},${order.delivery_address.longitude}`;
    const routeData = await Geolocation2Service.calculateRouteForDriver(origin, destination);

    const route = await Route.create({
      origin: { lat: order.MerchantBranch.latitude, lng: order.MerchantBranch.longitude },
      destination: { lat: order.delivery_address.latitude, lng: order.delivery_address.longitude },
      distance: routeData.distance.value,
      duration: routeData.duration.value,
      polyline: routeData.polyline,
      steps: routeData.steps,
      trafficModel: 'best_guess',
    });

    const estimatedDeliveryTime = new Date(Date.now() + routeData.duration.value * 1000);

    await order.update({
      driver_id: driver.id,
      routeId: route.id,
      status: 'out_for_delivery',
      estimated_delivery_time: estimatedDeliveryTime,
    });

    await driver.update({ activeRouteId: route.id });

    await NotificationService.sendThroughChannel({
      user_id: driver.user_id,
      order_id,
      type: 'delivery_assignment',
      message: `Deliver order #${order.order_number} from ${order.MerchantBranch.name} to ${order.delivery_address.formattedAddress}.`,
      priority: 'HIGH',
    });

    await NotificationService.sendThroughChannel({
      user_id: order.customer.user_id,
      order_id,
      type: 'out_for_delivery',
      message: `Your order #${order.order_number} is out for delivery!`,
      priority: 'MEDIUM',
    });

    return {
      order_id,
      driver_id: driver.id,
      estimated_delivery_time: estimatedDeliveryTime,
    };
  }

  static async findNearestAvailableDriver(latitude, longitude) {
    const drivers = await Driver.findAll({
      where: { availability_status: 'available' },
      attributes: ['id', 'user_id', 'current_latitude', 'current_longitude'],
    });

    let nearestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      const distance = mathUtils.calculateDistance(
        latitude,
        longitude,
        driver.current_latitude,
        driver.current_longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestDriver = driver;
      }
    }

    return nearestDriver;
  }

  static async confirmPickup(order_id) {
    const order = await Order.findByPk(order_id);
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

    await order.update({ status: 'out_for_delivery' });
    logger.info('Order picked up', { order_id, driver_id: order.driver_id });

    await NotificationService.sendThroughChannel({
      user_id: order.customer.user_id,
      order_id,
      type: 'order_picked_up',
      message: `Your order #${order.order_number} has been picked up by the driver!`,
      priority: 'MEDIUM',
    });

    return { order_id, status: order.status };
  }

  static async confirmDelivery(order_id) {
    const order = await Order.findByPk(order_id);
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

    await order.update({ status: 'completed', actual_delivery_time: new Date() });
    logger.info('Order delivered', { order_id, actual_delivery_time: order.actual_delivery_time });

    await NotificationService.sendThroughChannel({
      user_id: order.customer.user_id,
      order_id,
      type: 'order_delivered',
      message: `Your order #${order.order_number} has been delivered!`,
      priority: 'MEDIUM',
    });

    return { order_id, status: order.status, actual_delivery_time: order.actual_delivery_time };
  }

  static async requestFeedback(order_id) {
    const order = await Order.findByPk(order_id);
    if (!order || order.status !== 'completed') {
      throw new AppError('Order not completed', 400, 'ORDER_NOT_COMPLETED');
    }

    await NotificationService.sendThroughChannel({
      user_id: order.customer.user_id,
      order_id,
      type: 'feedback_request',
      message: `How was your experience with order #${order.order_number}? Leave a review!`,
      priority: 'LOW',
    });

    return { order_id, status: order.status };
  }

  static async getOrderStatus(order_id) {
    const order = await Order.findByPk(order_id, {
      attributes: ['id', 'order_number', 'status', 'estimated_delivery_time', 'actual_delivery_time'],
    });
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    return order;
  }
}

module.exports = OrderService;