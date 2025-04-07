'use strict';

const { Booking, InDiningOrder, Table, Staff, Notification, Customer, MerchantBranch, Subscription, Payment } = require('@models');
const NotificationService = require('@services/notifications/core/notificationService');
const AvailabilityShiftService = require('@services/staff/availabilityShiftService');
const PaymentService = require('@services/common/paymentService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const { Op } = require('sequelize');
const { io } = require('@server/server');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

class StaffManagementService {
  constructor() {
    this.notificationService = NotificationService;
    this.paymentService = PaymentService;
  }

  async getBookingsForStaff(staffId, period, startDate = new Date()) {
    try {
      const staff = await Staff.findByPk(staffId, {
        include: [{ model: User, as: 'user' }],
      });
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      const branchIds = [staff.branch_id];
      if (!branchIds.length) throw new AppError('Staff not assigned to any branch', 400, 'NO_BRANCH_ASSIGNED');

      let dateRange;
      const endDate = new Date(startDate);
      switch (period.toLowerCase()) {
        case 'day':
          endDate.setDate(startDate.getDate() + 1);
          break;
        case 'week':
          endDate.setDate(startDate.getDate() + 7);
          break;
        case 'month':
          endDate.setMonth(startDate.getMonth() + 1);
          break;
        default:
          throw new AppError('Invalid period. Use "day", "week", or "month"', 400, 'INVALID_PERIOD');
      }

      const cacheKey = `bookings:${staffId}:${period}:${startDate.toISOString().split('T')[0]}`;
      const cachedBookings = await redis.get(cacheKey);
      if (cachedBookings) return JSON.parse(cachedBookings);

      const bookings = await Booking.findAll({
        where: {
          branch_id: { [Op.in]: branchIds },
          booking_date: { [Op.gte]: startDate, [Op.lt]: endDate },
          status: { [Op.in]: ['pending', 'approved', 'seated'] },
        },
        include: [
          { model: Table, as: 'table' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
        order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
      });

      const formattedBookings = bookings.map(booking => ({
        id: booking.id,
        tableNumber: booking.table.table_number,
        customerName: booking.customer.user ? booking.customer.user.getFullName() : 'Unknown',
        bookingDate: booking.format_date(),
        bookingTime: booking.format_time(),
        guestCount: booking.guest_count,
        status: booking.status,
      }));

      await redis.setex(cacheKey, 300, JSON.stringify(formattedBookings));
      logger.info('Bookings retrieved for staff', { staffId, period, count: bookings.length });
      return formattedBookings;
    } catch (error) {
      logger.error('Error retrieving bookings for staff', { error: error.message, staffId, period });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve bookings', 500);
    }
  }

  async sendInAppNotification(recipientId, message, data) {
    try {
      io.to(`user:${recipientId}`).emit('notification', {
        message,
        data,
        timestamp: new Date(),
      });
      logger.info('In-app notification sent', { recipientId, message });
    } catch (error) {
      logger.error('Error sending in-app notification', { error: error.message, recipientId });
      throw new AppError('Failed to send in-app notification', 500);
    }
  }

  async handleBookingNotification(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Table, as: 'table' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
          { model: MerchantBranch, as: 'branch' },
        ],
      });
      if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');

      const staff = await this.findAvailableStaff(booking.branch_id);
      if (staff) {
        booking.staff_id = staff.id;
        await booking.save();
        await AvailabilityShiftService.updateRealTimeAvailability(staff);
      }

      const message = {
        title: 'New Booking',
        body: `Booking #${booking.reference} for table ${booking.table.table_number} on ${booking.format_date()} at ${booking.format_time()}.`,
        data: { type: 'booking_notification', bookingId: booking.id, staffId: staff?.id },
      };

      io.to(`branch_${booking.branch_id}`).emit('bookingUpdate', {
        bookingId: booking.id,
        tableId: booking.table_id,
        status: booking.status,
        timestamp: new Date(),
      });

      if (staff) {
        const staffUser = staff.user;
        const customerUser = booking.customer.user;

        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_booking_alert', parameters: { reference: booking.reference, tableNumber: booking.table.table_number } },
          content: message.body,
          recipient: staffUser.phone || process.env.DEFAULT_STAFF_PHONE,
        });

        await this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'staff_booking_alert', parameters: { reference: booking.reference, tableNumber: booking.table.table_number } },
          content: message.body,
          recipient: staffUser.email || process.env.DEFAULT_STAFF_EMAIL,
        });

        await this.sendInAppNotification(staff.user_id, message.body, message.data);
        await this.sendInAppNotification(booking.customer.user_id, `Your booking #${booking.reference} has been assigned to staff.`, {
          type: 'booking_assigned',
          bookingId: booking.id,
        });
      }

      logger.info('Staff notified of new booking', { bookingId, staffId: staff?.id });
    } catch (error) {
      logger.error('Error handling booking notification', { error: error.message, bookingId });
      throw error instanceof AppError ? error : new AppError('Failed to handle booking notification', 500);
    }
  }

  async handleInDiningOrderNotification(orderId) {
    try {
      const order = await InDiningOrder.findByPk(orderId, {
        include: [
          { model: Table, as: 'table' },
          { model: MerchantBranch, as: 'branch' },
          { model: Payment, as: 'payment' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
      });
      if (!order) throw new AppError('In-dining order not found', 404, 'ORDER_NOT_FOUND');

      let staff = order.staff_id ? await Staff.findByPk(order.staff_id, { include: [{ model: User, as: 'user' }] }) : null;
      if (!staff) {
        staff = await this.findAvailableStaff(order.branch_id);
        if (staff) {
          order.staff_id = staff.id;
          await order.save();
          await AvailabilityShiftService.updateRealTimeAvailability(staff);
        }
      }

      const paymentStatus = order.payment ? order.payment.status : 'pending';
      const message = {
        title: 'In-Dining Order Update',
        body: `Order #${order.order_number} at table ${order.table.table_number} updated. Payment: ${paymentStatus}.`,
        data: { type: 'order_notification', orderId: order.id, staffId: staff?.id },
      };

      io.to(`branch_${order.branch_id}`).emit('orderUpdate', {
        orderId: order.id,
        tableId: order.table_id,
        status: order.status,
        paymentStatus,
        timestamp: new Date(),
      });

      if (staff) {
        const staffUser = staff.user;
        const customerUser = order.customer.user;

        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_order_update', parameters: { orderNumber: order.order_number, tableNumber: order.table.table_number, paymentStatus } },
          content: message.body,
          recipient: staffUser.phone || process.env.DEFAULT_STAFF_PHONE,
        });

        await this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'staff_order_update', parameters: { orderNumber: order.order_number, tableNumber: order.table.table_number, paymentStatus } },
          content: message.body,
          recipient: staffUser.email || process.env.DEFAULT_STAFF_EMAIL,
        });

        await this.sendInAppNotification(staff.user_id, message.body, message.data);
        await this.sendInAppNotification(order.customer.user_id, `Your order #${order.order_number} has been updated.`, {
          type: 'order_updated',
          orderId: order.id,
        });
      }

      logger.info('Staff notified of in-dining order update', { orderId, staffId: staff?.id });
    } catch (error) {
      logger.error('Error handling in-dining order notification', { error: error.message, orderId });
      throw error instanceof AppError ? error : new AppError('Failed to handle order notification', 500);
    }
  }

  async handleQuickLinkRequest(staffId, notificationId) {
    try {
      const notification = await Notification.findByPk(notificationId, {
        include: [
          { model: InDiningOrder, as: 'order', include: [{ model: Payment, as: 'payment' }, { model: Table, as: 'table' }] },
          { model: User, as: 'user' },
        ],
      });
      if (!notification || !['staff_request', 'check_in', 'bill_request'].includes(notification.type)) {
        throw new AppError('Invalid or non-existent quick link request', 404, 'REQUEST_NOT_FOUND');
      }

      const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
      if (!staff) throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');

      notification.read_status = true;
      notification.message += ` - Handled by ${staff.user.getFullName()}`;
      await notification.save();

      const tableIdMatch = notification.message.match(/table (\d+)/);
      const tableId = tableIdMatch ? tableIdMatch[1] : null;
      if (tableId) {
        await Table.update(
          { assigned_staff_id: staffId },
          { where: { table_number: tableId, branch_id: staff.branch_id } }
        );
      }

      const paymentStatus = notification.order?.payment?.status || 'pending';
      const message = {
        title: 'Quick Link Request Handled',
        body: `Your request at table ${tableId || 'unknown'} has been handled by ${staff.user.getFullName()}. Payment: ${paymentStatus}.`,
        data: { type: 'quick_link_response', notificationId, staffId },
      };

      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: { templateName: 'staff_response', parameters: { tableNumber: tableId || 'unknown', staffName: staff.user.getFullName(), paymentStatus } },
        content: message.body,
        recipient: notification.user.phone || process.env.DEFAULT_STAFF_PHONE,
      });

      await this.notificationService.sendThroughChannel('EMAIL', {
        notification: { templateName: 'staff_response', parameters: { tableNumber: tableId || 'unknown', staffName: staff.user.getFullName(), paymentStatus } },
        content: message.body,
        recipient: notification.user.email || process.env.DEFAULT_CUSTOMER_EMAIL,
      });

      await this.sendInAppNotification(notification.user_id, message.body, message.data);
      await this.sendInAppNotification(staff.user_id, `You handled a request at table ${tableId || 'unknown'}.`, {
        type: 'quick_link_handled',
        notificationId,
      });

      await AvailabilityShiftService.updateRealTimeAvailability(staff);
      logger.info('Staff handled quick link request', { staffId, notificationId });
      return notification;
    } catch (error) {
      logger.error('Error handling quick link request', { error: error.message, staffId, notificationId });
      throw new AppError('Failed to handle quick link request', 500);
    }
  }

  async handleSubscriptionNotification(subscriptionId) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
          { model: Order, as: 'orders', where: { status: 'pending' }, required: false, include: [{ model: Payment, as: 'payment' }] },
        ],
      });
      if (!subscription) throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');

      const latestOrder = subscription.orders[0];
      if (!latestOrder) return;

      const staff = await this.findAvailableStaff(latestOrder.branch_id); // Assuming Order has branch_id
      if (staff) {
        latestOrder.staff_id = staff.id;
        await latestOrder.save();
        await AvailabilityShiftService.updateRealTimeAvailability(staff);
      }

      const paymentStatus = latestOrder.payment ? latestOrder.payment.status : 'pending';
      const message = {
        title: 'Subscription Order',
        body: `New order #${latestOrder.order_number} from subscription ${subscription.id} for ${subscription.customer.user.getFullName()}. Payment: ${paymentStatus}.`,
        data: { type: 'subscription_notification', subscriptionId, orderId: latestOrder.id, staffId: staff?.id },
      };

      io.to(`branch_${latestOrder.branch_id}`).emit('subscriptionUpdate', {
        subscriptionId: subscription.id,
        orderId: latestOrder.id,
        paymentStatus,
        timestamp: new Date(),
      });

      if (staff) {
        const staffUser = staff.user;
        const customerUser = subscription.customer.user;

        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_subscription_alert', parameters: { orderNumber: latestOrder.order_number, customerName: customerUser.getFullName(), paymentStatus } },
          content: message.body,
          recipient: staffUser.phone || process.env.DEFAULT_STAFF_PHONE,
        });

        await this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'staff_subscription_alert', parameters: { orderNumber: latestOrder.order_number, customerName: customerUser.getFullName(), paymentStatus } },
          content: message.body,
          recipient: staffUser.email || process.env.DEFAULT_STAFF_EMAIL,
        });

        await this.sendInAppNotification(staff.user_id, message.body, message.data);
        await this.sendInAppNotification(subscription.customer.user_id, `Your subscription order #${latestOrder.order_number} has been assigned to staff.`, {
          type: 'subscription_order_assigned',
          orderId: latestOrder.id,
        });
      }

      logger.info('Staff notified of subscription order', { subscriptionId, orderId: latestOrder.id, staffId: staff?.id });
    } catch (error) {
      logger.error('Error handling subscription notification', { error: error.message, subscriptionId });
      throw error instanceof AppError ? error : new AppError('Failed to handle subscription notification', 500);
    }
  }

  async handlePaymentNotification(paymentId) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [
          { model: InDiningOrder, as: 'order', include: [{ model: Table, as: 'table' }, { model: MerchantBranch, as: 'branch' }] },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
      });
      if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

      const staff = payment.order?.staff_id ? await Staff.findByPk(payment.order.staff_id, { include: [{ model: User, as: 'user' }] }) : await this.findAvailableStaff(payment.order?.branch_id);
      if (staff && !payment.order?.staff_id) {
        payment.order.staff_id = staff.id;
        await payment.order.save();
        await AvailabilityShiftService.updateRealTimeAvailability(staff);
      }

      const message = {
        title: 'Payment Update',
        body: `Payment ${payment.status} for order #${payment.order?.order_number || 'unknown'} at table ${payment.order?.table.table_number || 'unknown'}. Amount: ${payment.amount}.`,
        data: { type: 'payment_notification', paymentId, staffId: staff?.id },
      };

      if (payment.order) {
        io.to(`branch_${payment.order.branch_id}`).emit('paymentUpdate', {
          paymentId: payment.id,
          orderId: payment.order.id,
          status: payment.status,
          timestamp: new Date(),
        });
      }

      if (staff) {
        const staffUser = staff.user;
        const customerUser = payment.customer.user;

        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_payment_alert', parameters: { orderNumber: payment.order?.order_number || 'unknown', tableNumber: payment.order?.table.table_number || 'unknown', status: payment.status, amount: payment.amount } },
          content: message.body,
          recipient: staffUser.phone || process.env.DEFAULT_STAFF_PHONE,
        });

        await this.notificationService.sendThroughChannel('EMAIL', {
          notification: { templateName: 'staff_payment_alert', parameters: { orderNumber: payment.order?.order_number || 'unknown', tableNumber: payment.order?.table.table_number || 'unknown', status: payment.status, amount: payment.amount } },
          content: message.body,
          recipient: staffUser.email || process.env.DEFAULT_STAFF_EMAIL,
        });

        await this.sendInAppNotification(staff.user_id, message.body, message.data);
        await this.sendInAppNotification(payment.customer.user_id, `Your payment of ${payment.amount} for order #${payment.order?.order_number || 'unknown'} is ${payment.status}.`, {
          type: 'payment_status',
          paymentId,
        });
      }

      logger.info('Staff notified of payment update', { paymentId, staffId: staff?.id });
    } catch (error) {
      logger.error('Error handling payment notification', { error: error.message, paymentId });
      throw error instanceof AppError ? error : new AppError('Failed to handle payment notification', 500);
    }
  }

  async findAvailableStaff(branchId) {
    const staff = await Staff.findOne({
      where: {
        branch_id: branchId,
        availability_status: 'available',
      },
      include: [{ model: User, as: 'user' }],
    });
    return staff || null;
  }
}

module.exports = new StaffManagementService();