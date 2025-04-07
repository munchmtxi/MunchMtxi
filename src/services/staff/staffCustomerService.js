'use strict';

const { Booking, Table, Staff, Notification, InDiningOrder, User, MerchantBranch, Customer } = require('@models');
const BookingService = require('@services/customer/bookingService');
const NotificationService = require('@services/notifications/core/notificationService');
const InDiningOrderService = require('@services/customer/inDiningOrderService');
const QuickLinkService = require('@services/customer/quickLinkService');
const AvailabilityShiftService = require('@services/staff/availabilityShiftService');
const { logger, PerformanceMonitor, logApiEvent, logErrorEvent } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Sequelize } = require('sequelize');
const config = require('@config/config');

class StaffCustomerService {
  constructor(io, whatsappService, emailService, smsService) {
    this.io = io;
    this.performanceMonitor = PerformanceMonitor;
    this.notificationService = new NotificationService(io, whatsappService, emailService, smsService);
    this.bookingService = BookingService;
    this.inDiningOrderService = new InDiningOrderService(io);
    this.quickLinkService = new QuickLinkService();
    this.availabilityShiftService = new AvailabilityShiftService(io);
    this.availabilityShiftService.setNotificationService(this.notificationService);
    this.sequelize = Sequelize;
  }

  async handleCheckIn(bookingId, staffId) {
    const perf = this.performanceMonitor.start('handleCheckIn');
    const transaction = await this.sequelize.transaction();
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Table, as: 'table' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
          { model: MerchantBranch, as: 'branch' },
        ],
        transaction,
      });
      if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      if (!['pending', 'approved'].includes(booking.status)) {
        throw new AppError('Booking cannot be checked in', 400, 'INVALID_BOOKING_STATUS');
      }

      const updatedBooking = await this.bookingService.checkInBooking({ bookingId, merchantId: booking.merchant_id }, { transaction });
      await booking.update({ seated_at: new Date(), staff_id: staffId }, { transaction });

      const assignedStaff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }], transaction });
      await Table.update(
        { status: 'occupied', assigned_staff_id: staffId },
        { where: { id: booking.table_id }, transaction }
      );

      const staffMessage = `Customer ${booking.customer.user.getFullName()} checked in at table ${booking.table.table_number} (Booking: ${booking.reference}) by staff`;
      await Notification.create({
        user_id: assignedStaff.user_id,
        booking_id: bookingId,
        type: 'check_in',
        message: staffMessage,
        priority: 'MEDIUM',
      }, { transaction });

      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: {
          templateName: 'staff_checkin_alert',
          parameters: {
            customerName: booking.customer.user.getFullName(),
            tableNumber: booking.table.table_number,
            bookingReference: booking.reference,
          },
        },
        content: staffMessage,
        recipient: assignedStaff.user.phone || config.whatsapp.twilioWhatsappNumber,
      });

      this.io.to(`branch:${booking.branch_id}`).emit('checkInUpdate', {
        bookingId,
        tableId: booking.table_id,
        staffId,
        timestamp: new Date(),
      });

      await transaction.commit();
      logApiEvent('Staff handled customer check-in', { bookingId, staffId });
      return updatedBooking;
    } catch (error) {
      await transaction.rollback();
      logErrorEvent('Error handling check-in', { error: error.message, bookingId, staffId });
      throw error instanceof AppError ? error : new AppError('Failed to handle check-in', 500, 'CHECKIN_FAILED');
    } finally {
      perf.end();
    }
  }

  async handleAssistanceRequest(tableId, requestType, staffId) {
    const perf = this.performanceMonitor.start('handleAssistanceRequest');
    const transaction = await this.sequelize.transaction();
    try {
      const table = await Table.findByPk(tableId, {
        include: [{ model: MerchantBranch, as: 'branch' }],
        transaction,
      });
      if (!table) throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND');
      if (!['occupied', 'reserved'].includes(table.status)) {
        throw new AppError('Table not in use', 400, 'TABLE_NOT_IN_USE');
      }

      const { notification } = await this.quickLinkService.callStaff(null, tableId, requestType); // No customer userId needed

      const assignedStaff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }], transaction });
      if (table.assigned_staff_id && table.assigned_staff_id !== staffId) {
        throw new AppError('Table is assigned to another staff member', 403, 'NOT_ASSIGNED');
      }

      if (!table.assigned_staff_id) {
        await Table.update(
          { assigned_staff_id: staffId },
          { where: { id: tableId }, transaction }
        );
        await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy', { transaction });
      }

      this.io.to(`branch:${table.branch_id}`).emit('assistanceRequest', {
        tableId,
        requestType,
        staffId,
        notificationId: notification.id,
        timestamp: new Date(),
      });

      await transaction.commit();
      logApiEvent('Staff handled assistance request', { tableId, requestType, staffId });
      return notification;
    } catch (error) {
      await transaction.rollback();
      logErrorEvent('Error handling assistance request', { error: error.message, tableId, staffId, requestType });
      throw error instanceof AppError ? error : new AppError('Failed to handle assistance request', 500, 'ASSISTANCE_FAILED');
    } finally {
      perf.end();
    }
  }

  async processBill(orderId, staffId, paymentMethod, splitWith = []) {
    const perf = this.performanceMonitor.start('processBill');
    const transaction = await this.sequelize.transaction();
    try {
      const order = await InDiningOrder.findByPk(orderId, {
        include: [
          { model: Table, as: 'table' },
          { model: MerchantBranch, as: 'branch' },
          { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        ],
        transaction,
      });
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (order.payment_status !== 'unpaid') throw new AppError('Bill already processed', 400, 'BILL_ALREADY_PAID');

      const assignedStaff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }], transaction });
      if (order.staff_id && order.staff_id !== staffId) {
        throw new AppError('Order is assigned to another staff member', 403, 'NOT_ASSIGNED');
      }

      if (!order.staff_id) {
        await order.update({ staff_id: staffId }, { transaction });
        await Table.update(
          { assigned_staff_id: staffId },
          { where: { id: order.table_id }, transaction }
        );
        await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy', { transaction });
      }

      const { payment } = await this.quickLinkService.requestBill(order.customer.user_id, orderId, paymentMethod, splitWith);
      const updatedOrder = await this.inDiningOrderService.payOrder(orderId, order.customer_id, {
        payment_method: paymentMethod.type,
        provider: paymentMethod.provider,
        phone_number: order.customer.user.phone,
      }, { transaction });

      const staffMessage = `Bill for table ${order.table.table_number} (Order: ${order.order_number}) processed by staff, payment ${updatedOrder.payment_status}`;
      await Notification.create({
        user_id: assignedStaff.user_id,
        order_id: orderId,
        type: 'bill_request',
        message: staffMessage,
        priority: 'MEDIUM',
      }, { transaction });

      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: {
          templateName: 'staff_bill_request',
          parameters: {
            tableNumber: order.table.table_number,
            orderNumber: order.order_number,
            paymentStatus: updatedOrder.payment_status,
          },
        },
        content: staffMessage,
        recipient: assignedStaff.user.phone || config.whatsapp.twilioWhatsappNumber,
      });

      this.io.to(`branch:${order.branch_id}`).emit('billRequestUpdate', {
        orderId,
        tableId: order.table_id,
        staffId,
        paymentStatus: updatedOrder.payment_status,
        timestamp: new Date(),
      });

      if (updatedOrder.payment_status === 'paid') {
        await this.inDiningOrderService.requestFeedback(orderId, order.customer_id, { transaction });
      }

      await transaction.commit();
      logApiEvent('Staff processed bill', { orderId, staffId, paymentStatus: updatedOrder.payment_status });
      return updatedOrder;
    } catch (error) {
      await transaction.rollback();
      logErrorEvent('Error processing bill', { error: error.message, orderId, staffId });
      throw error instanceof AppError ? error : new AppError('Failed to process bill', 500, 'BILL_PROCESSING_FAILED');
    } finally {
      perf.end();
    }
  }
}

module.exports = StaffCustomerService;