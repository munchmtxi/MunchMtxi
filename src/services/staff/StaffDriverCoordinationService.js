'use strict';

const { Order, Driver, Route, Notification, Staff, User, Payment, MerchantBranch, Customer } = require('@models');
const NotificationService = require('@services/notifications/core/notificationService');
const Geolocation1Service = require('@services/geolocation/geolocation1Service');
const Geolocation2Service = require('@services/geolocation/geolocation2Service');
const PaymentService = require('@services/common/paymentService');
const jwt = require('jsonwebtoken');
const AvailabilityShiftService = require('@services/staff/availabilityShiftService');
const { logger, PerformanceMonitor } = require('@utils/logger');
const AppError = require('@utils/appError');
const { Op } = require('sequelize');
const config = require('@config/config');


class StaffDriverCoordinationService {
  constructor(io) {
    this.io = io;
    this.performanceMonitor = PerformanceMonitor;
    this.notificationService = new NotificationService(io);
    this.availabilityShiftService = new AvailabilityShiftService(io);
    this.availabilityShiftService.setNotificationService(this.notificationService);
  }

  async assignDriver(staffId, orderId, driverId = null) {
    const perf = this.performanceMonitor.start('assignDriver');
    try {
      const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const order = await Order.findByPk(orderId, {
        include: [
          { model: MerchantBranch, as: 'branch' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
      });
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (order.status !== 'preparing') {
        throw new AppError('Order not ready for driver assignment', 400, 'INVALID_ORDER_STATUS');
      }
      if (!order.delivery_location) {
        throw new AppError('Delivery location not set for order', 400, 'MISSING_DELIVERY_LOCATION');
      }

      let selectedDriver;
      if (driverId) {
        selectedDriver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
        if (!selectedDriver) throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
        if (selectedDriver.availability_status !== 'available') {
          throw new AppError('Driver not available', 400, 'DRIVER_UNAVAILABLE');
        }
      } else {
        const drivers = await Driver.findAll({
          where: { availability_status: 'available' },
          include: [{ model: User, as: 'user' }],
        });
        if (!drivers.length) throw new AppError('No available drivers found', 404, 'NO_DRIVERS_AVAILABLE');

        const branchLocation = order.branch.google_location || order.branch.work_location;
        selectedDriver = await this.selectNearestDriver(drivers, branchLocation);
      }

      await order.update({ driver_id: selectedDriver.id, staff_id: staffId });

      const route = await Route.create({
        order_id: orderId,
        driver_id: selectedDriver.id,
        origin: order.branch.google_location || order.branch.work_location,
        destination: order.delivery_location,
        status: 'assigned',
        distance: null,
        duration: null,
        polyline: null,
      });

      await selectedDriver.update({ active_route_id: route.id });

      this.io.to(`driver:${selectedDriver.id}`).emit('orderAssigned', {
        orderId,
        routeId: route.id,
        timestamp: new Date(),
      });

      const driverPhone = selectedDriver.user.phone;
      const driverEmail = selectedDriver.user.email;
      const customerPhone = order.customer.user.phone;
      const customerEmail = order.customer.user.email;

      // Notify driver via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'driver_assignment' },
          content: `You are assigned to order ${order.order_number} for pickup at ${order.branch.name}.`,
          recipient: driverPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'driver_assignment' },
          subject: `New Order Assignment: ${order.order_number}`,
          content: `You are assigned to order ${order.order_number} for pickup at ${order.branch.name}. Please proceed promptly.`,
          recipient: driverEmail,
        }),
      ]);

      // Notify customer via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'driver_assigned' },
          content: `A driver has been assigned to your order ${order.order_number}.`,
          recipient: customerPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'driver_assigned' },
          subject: `Update: Driver Assigned to Order ${order.order_number}`,
          content: `Good news! A driver has been assigned to your order ${order.order_number}. You’ll receive further updates soon.`,
          recipient: customerEmail,
        }),
      ]);

      await this.availabilityShiftService.setAvailabilityStatus(selectedDriver.id, 'busy');

      logger.info('Driver assigned to order', { staffId, orderId, driverId: selectedDriver.id });
      return order;
    } catch (error) {
      logger.error('Error assigning driver', { error: error.message, staffId, orderId, driverId });
      throw error instanceof AppError ? error : new AppError('Failed to assign driver', 500);
    } finally {
      perf.end();
    }
  }

  async confirmPickup(staffId, orderId, driverToken) {
    const perf = this.performanceMonitor.start('confirmPickup');
    try {
      const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const order = await Order.findByPk(orderId, {
        include: [{ model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] }],
      });
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (!order.driver_id) throw new AppError('No driver assigned to order', 400, 'NO_DRIVER_ASSIGNED');
      if (order.status !== 'preparing') {
        throw new AppError('Order not ready for pickup', 400, 'INVALID_ORDER_STATUS');
      }

      const driver = order.driver;
      const tokenPayload = jwt.verify(driverToken, config.jwt.secret);
      if (tokenPayload.sub !== driver.user_id) {
        throw new AppError('Invalid driver token', 403, 'INVALID_TOKEN');
      }

      await order.update({ status: 'out_for_delivery' });

      await Route.update(
        { status: 'in_progress' },
        { where: { order_id: orderId, driver_id: driver.id } }
      );

      this.io.to(`driver:${driver.id}`).emit('pickupConfirmed', {
        orderId,
        timestamp: new Date(),
      });

      const driverPhone = driver.user.phone;
      const driverEmail = driver.user.email;
      const customerPhone = order.customer.user.phone;
      const customerEmail = order.customer.user.email;

      // Notify driver via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'pickup_confirmation' },
          content: `Order ${order.order_number} is ready for pickup at ${order.branch.name}.`,
          recipient: driverPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'pickup_confirmation' },
          subject: `Pickup Ready: Order ${order.order_number}`,
          content: `Order ${order.order_number} is ready for pickup at ${order.branch.name}. Please proceed to collect it.`,
          recipient: driverEmail,
        }),
      ]);

      // Notify customer via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'order_out_for_delivery' },
          content: `Your order ${order.order_number} is on its way!`,
          recipient: customerPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'order_out_for_delivery' },
          subject: `Order Update: ${order.order_number} Out for Delivery`,
          content: `Your order ${order.order_number} is now out for delivery. Expect it soon!`,
          recipient: customerEmail,
        }),
      ]);

      logger.info('Pickup confirmed', { staffId, orderId, driverId: driver.id });
      return order;
    } catch (error) {
      logger.error('Error confirming pickup', { error: error.message, staffId, orderId });
      throw error instanceof AppError ? error : new AppError('Failed to confirm pickup', 500);
    } finally {
      perf.end();
    }
  }

  async trackDelivery(staffId, orderId) {
    const perf = this.performanceMonitor.start('trackDelivery');
    try {
      const staff = await Staff.findByPk(staffId);
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const order = await Order.findByPk(orderId, {
        include: [
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
          { model: Route, as: 'route' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
      });
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (!order.driver_id) throw new AppError('No driver assigned to order', 400, 'NO_DRIVER_ASSIGNED');
      if (order.status !== 'out_for_delivery') {
        throw new AppError('Order not out for delivery', 400, 'INVALID_ORDER_STATUS');
      }

      const driverLocation = await Geolocation1Service.reverseGeocode(
        order.driver.current_location.coordinates[1],
        order.driver.current_location.coordinates[0]
      );

      const routeDetails = await Geolocation2Service.calculateRouteForDriver(
        driverLocation.formattedAddress,
        order.delivery_location
      );

      await Route.update(
        {
          distance: routeDetails.distance.value,
          duration: routeDetails.duration.value,
          polyline: routeDetails.polyline,
        },
        { where: { id: order.route.id } }
      );

      const trackingData = {
        orderId,
        driverId: order.driver_id,
        currentLocation: driverLocation.formattedAddress,
        routeStatus: order.route.status,
        estimatedDeliveryTime: new Date(Date.now() + routeDetails.duration.value * 1000),
        distanceRemaining: routeDetails.distance.value,
      };

      this.io.to(`branch:${order.branch_id}`).emit('deliveryUpdate', {
        ...trackingData,
        timestamp: new Date(),
      });

      logger.info('Delivery tracked', { staffId, orderId, driverId: order.driver_id });
      return trackingData;
    } catch (error) {
      logger.error('Error tracking delivery', { error: error.message, staffId, orderId });
      throw error instanceof AppError ? error : new AppError('Failed to track delivery', 500);
    } finally {
      perf.end();
    }
  }

  async completeOrder(staffId, orderId) {
    const perf = this.performanceMonitor.start('completeOrder');
    try {
      const staff = await Staff.findByPk(staffId);
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const order = await Order.findByPk(orderId, {
        include: [
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
          { model: Payment, as: 'payments' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
      });
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (order.status !== 'out_for_delivery') {
        throw new AppError('Order not out for delivery', 400, 'INVALID_ORDER_STATUS');
      }

      await order.update({
        status: 'completed',
        actual_delivery_time: new Date(),
      });

      await Route.update(
        { status: 'completed', completed_at: new Date() },
        { where: { order_id: orderId } }
      );

      await order.driver.update({ active_route_id: null });

      const activePayment = order.payments.find(p => p.status === 'verified' || p.status === 'pending');
      if (activePayment && activePayment.status !== 'completed') {
        await PaymentService.updatePaymentStatus(activePayment.id, 'completed', {
          transaction_id: `TXN_${orderId}_${Date.now()}`,
        });
      }

      this.io.to(`branch:${order.branch_id}`).emit('orderCompleted', {
        orderId,
        driverId: order.driver_id,
        timestamp: new Date(),
      });

      const driverPhone = order.driver.user.phone;
      const driverEmail = order.driver.user.email;
      const customerPhone = order.customer.user.phone;
      const customerEmail = order.customer.user.email;

      // Notify customer via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'order_delivered' },
          content: `Your order ${order.order_number} has been delivered!`,
          recipient: customerPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'order_delivered' },
          subject: `Order Delivered: ${order.order_number}`,
          content: `Your order ${order.order_number} has been successfully delivered. Enjoy!`,
          recipient: customerEmail,
        }),
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'feedback_request' },
          content: 'How was your experience with your recent delivery?',
          recipient: customerPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'feedback_request' },
          subject: 'We’d Love Your Feedback!',
          content: `How was your experience with order ${order.order_number}? Let us know your thoughts!`,
          recipient: customerEmail,
        }),
      ]);

      // Notify driver via WhatsApp and Email
      await Promise.all([
        this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'delivery_completed' },
          content: `Order ${order.order_number} marked as completed.`,
          recipient: driverPhone,
        }),
        this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'delivery_completed' },
          subject: `Delivery Completed: ${order.order_number}`,
          content: `Order ${order.order_number} has been marked as completed. Great work!`,
          recipient: driverEmail,
        }),
      ]);

      await this.availabilityShiftService.setAvailabilityStatus(order.driver_id, 'available');

      logger.info('Order completed', { staffId, orderId, driverId: order.driver_id });
      return order;
    } catch (error) {
      logger.error('Error completing order', { error: error.message, staffId, orderId });
      throw error instanceof AppError ? error : new AppError('Failed to complete order', 500);
    } finally {
      perf.end();
    }
  }

  async getDriverOrderOverview(staffId, branchId) {
    const perf = this.performanceMonitor.start('getDriverOrderOverview');
    try {
      const staff = await Staff.findByPk(staffId);
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const orders = await Order.findAll({
        where: {
          branch_id: branchId,
          driver_id: { [Op.ne]: null },
          status: { [Op.in]: ['preparing', 'out_for_delivery', 'completed'] },
        },
        include: [
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
          { model: Route, as: 'route' },
        ],
      });

      const overview = await Promise.all(
        orders.map(async order => {
          const efficiency = await this.calculateDriverEfficiency(order.driver);
          return {
            orderId: order.id,
            orderNumber: order.order_number,
            driver: {
              id: order.driver.id,
              name: order.driver.user.getFullName(),
              availability: order.driver.availability_status,
              efficiency,
            },
            route: {
              id: order.route?.id,
              status: order.route?.status,
              estimatedDeliveryTime: order.estimated_delivery_time,
            },
            status: order.status,
            createdAt: order.created_at,
          };
        })
      );

      logger.info('Driver order overview retrieved', { staffId, branchId, orderCount: overview.length });
      return overview;
    } catch (error) {
      logger.error('Error retrieving driver order overview', { error: error.message, staffId, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve driver order overview', 500);
    } finally {
      perf.end();
    }
  }

  async selectNearestDriver(drivers, branchLocation) {
    const distances = await Promise.all(
      drivers.map(async driver => {
        const driverLocation = await Geolocation1Service.reverseGeocode(
          driver.current_location.coordinates[1],
          driver.current_location.coordinates[0]
        );
        const route = await Geolocation2Service.calculateRouteForDriver(
          branchLocation,
          driverLocation.formattedAddress
        );
        return { driver, distance: route.distance.value };
      })
    );

    const nearest = distances.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev));
    return nearest.driver;
  }

  async calculateDriverEfficiency(driver) {
    const routes = await Route.findAll({ where: { driver_id: driver.id, status: 'completed' } });
    const totalTime = routes.reduce((sum, r) => sum + (r.completed_at - r.created_at) / 60000, 0);
    return routes.length / (totalTime || 1);
  }
}

module.exports = StaffDriverCoordinationService;