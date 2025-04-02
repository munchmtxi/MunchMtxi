'use strict';

const { Op } = require('sequelize');
const { Order, Driver, Route, Payment, Notification, DriverRatings, Device } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const mathUtils = require('@utils/mathUtils');
const PaymentService = require('@services/common/paymentService');
const NotificationService = require('@services/notifications/core/notificationService');
const TokenService = require('@services/tokenService');
const Geolocation1Service = require('@services/geoLocation/geolocation1Service');
const Geolocation2Service = require('@services/geoLocation/geolocation2Service');
const PerformanceMonitor = require('@utils/logger'); // Assuming PerformanceMonitor is part of logger utils

class DriverOrderService {
  /**
   * Assign an order to a driver and calculate the route
   * @param {Object} params - { order_id, driver_id }
   * @returns {Object} - Order and route details
   */
  static async assignOrder({ order_id, driver_id }) {
    const order = await Order.findByPk(order_id, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Route, as: 'route' },
      ],
    });
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    if (order.driver_id) throw new AppError('Order already assigned', 400, 'ORDER_ALREADY_ASSIGNED');

    const driver = await Driver.findByPk(driver_id, {
      include: [{ model: Device }],
    });
    if (!driver || driver.availability_status !== 'AVAILABLE') {
      throw new AppError('Driver unavailable', 404, 'DRIVER_UNAVAILABLE');
    }

    // Calculate route using Geolocation2Service
    const origin = `${driver.current_location.lat},${driver.current_location.lng}`;
    const destination = order.delivery_address ? 
      `${order.delivery_address.latitude},${order.delivery_address.longitude}` : 
      `${order.MerchantBranch.latitude},${order.MerchantBranch.longitude}`; // Fallback to merchant if no delivery address
    const routeData = await Geolocation2Service.calculateRouteForDriver(origin, destination);

    const route = await Route.create({
      origin: driver.current_location,
      destination: order.delivery_address || order.MerchantBranch,
      distance: routeData.distance.value,
      duration: routeData.duration.value,
      polyline: routeData.polyline,
      steps: routeData.steps,
      traffic_model: 'best_guess',
    });

    const estimatedDeliveryTime = new Date(Date.now() + routeData.duration.value * 1000);

    await order.update({
      driver_id,
      route_id: route.id,
      status: 'ASSIGNED',
      estimated_delivery_time: estimatedDeliveryTime,
    });
    await driver.update({ availability_status: 'BUSY', active_route_id: route.id });

    logger.logTransactionEvent('Order assigned to driver', {
      order_id,
      driver_id,
      route_id: route.id,
    });

    await NotificationService.sendThroughChannel({
      user_id: driver.user_id,
      order_id,
      type: 'delivery_assignment',
      message: `You have been assigned order #${order.order_number}.`,
      priority: 'HIGH',
      channel: 'PUSH', // Assuming driver uses app with push notifications
    });

    await NotificationService.sendThroughChannel({
      user_id: order.customer_id,
      order_id,
      type: 'out_for_delivery',
      message: `Your order #${order.order_number} has been assigned to a driver!`,
      priority: 'MEDIUM',
    });

    return {
      order_id,
      driver_id,
      route_id: route.id,
      estimated_delivery_time: estimatedDeliveryTime,
    };
  }

  /**
   * Confirm pickup of the order by the driver
   * @param {Object} params - { order_id, driver_id, token }
   * @returns {Object} - Updated order status
   */
  static async confirmPickup({ order_id, driver_id, token }) {
    const driver = await Driver.findByPk(driver_id);
    if (!driver) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');

    // Verify driver token using TokenService (simulating passport.js)
    const isValidToken = await TokenService.verifyToken(token, driver.user_id);
    if (!isValidToken) throw new AppError('Unauthorized', 401, 'INVALID_TOKEN');

    const order = await Order.findByPk(order_id);
    if (!order || order.driver_id !== driver_id) {
      throw new AppError('Order not assigned to this driver', 403, 'ORDER_MISMATCH');
    }

    await order.update({ status: 'OUT_FOR_DELIVERY' });
    logger.logApiEvent('Driver confirmed pickup', { order_id, driver_id });

    await NotificationService.sendThroughChannel({
      user_id: order.customer_id,
      order_id,
      type: 'order_picked_up',
      message: `Your order #${order.order_number} has been picked up by the driver!`,
      priority: 'MEDIUM',
    });

    return { order_id, status: order.status };
  }

  /**
   * Track delivery progress and validate address
   * @param {Object} params - { order_id, driver_id, current_location }
   * @returns {Object} - Tracking details
   */
  static async trackDelivery({ order_id, driver_id, current_location }) {
    const order = await Order.findByPk(order_id);
    if (!order || order.driver_id !== driver_id) {
      throw new AppError('Order not assigned to this driver', 403, 'ORDER_MISMATCH');
    }

    const driver = await Driver.findByPk(driver_id);
    if (!driver) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');

    // Update driver's current location
    await driver.update({ current_location });

    // Validate delivery address using Geolocation1Service
    const isValidAddress = await Geolocation1Service.validateAddress(
      order.delivery_address.latitude,
      order.delivery_address.longitude
    );
    if (!isValidAddress) {
      throw new AppError('Invalid delivery address', 400, 'INVALID_ADDRESS');
    }

    // Monitor performance
    PerformanceMonitor.trackRequest('trackDelivery', { order_id, driver_id });

    return {
      order_id,
      driver_id,
      current_location: driver.current_location,
      status: order.status,
    };
  }

  /**
   * Complete the order delivery
   * @param {Object} params - { order_id, driver_id }
   * @returns {Object} - Completion details
   */
  static async completeOrder({ order_id, driver_id }) {
    const order = await Order.findByPk(order_id, {
      include: [{ model: Payment }, { model: DriverRatings }],
    });
    if (!order || order.driver_id !== driver_id) {
      throw new AppError('Order not assigned to this driver', 403, 'ORDER_MISMATCH');
    }

    const driver = await Driver.findByPk(driver_id);
    if (!driver) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');

    // Process payment (assuming tip or final payment step)
    const payment = await PaymentService.processDriverPayment({
      order_id,
      driver_id,
      amount: order.total_amount, // Adjust as needed for driver earnings
    });

    if (payment.status !== 'completed') {
      throw new AppError('Payment processing failed', 402, 'PAYMENT_FAILED');
    }

    await order.update({
      status: 'COMPLETED',
      actual_delivery_time: new Date(),
    });
    await driver.update({
      availability_status: 'AVAILABLE',
      active_route_id: null,
    });

    logger.logTransactionEvent('Order delivery completed', {
      order_id,
      driver_id,
      actual_delivery_time: order.actual_delivery_time,
    });

    await NotificationService.sendThroughChannel({
      user_id: order.customer_id,
      order_id,
      type: 'order_delivered',
      message: `Your order #${order.order_number} has been delivered!`,
      priority: 'MEDIUM',
    });

    return {
      order_id,
      status: order.status,
      actual_delivery_time: order.actual_delivery_time,
    };
  }
}

module.exports = DriverOrderService;