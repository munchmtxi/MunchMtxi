'use strict';

const { Booking, Table, Staff, InDiningOrder, Customer, Notification } = require('@models');
const { NotificationService } = require('@services/notifications/core/notificationService');
const PaymentService = require('@services/common/paymentService');
const { logApiEvent, logTransactionEvent } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');

class QuickLinkService {
  constructor() {
    this.notificationService = NotificationService;
    this.paymentService = PaymentService;
  }

  /**
   * Handle customer check-in for a booking
   * @param {number} userId - The ID of the user checking in
   * @param {number} bookingId - The ID of the booking
   * @returns {Promise<Object>} - Updated booking object and wait time estimate
   */
  async checkIn(userId, bookingId) {
    const booking = await Booking.findOne({
      where: { id: bookingId },
      include: [
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table' },
      ],
    });

    if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    if (booking.customer.user_id !== userId) throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    if (!['pending', 'approved'].includes(booking.status)) {
      throw new AppError('Booking cannot be checked in', 400, 'INVALID_BOOKING_STATUS');
    }

    const now = new Date();
    await booking.update({
      status: 'seated',
      arrived_at: now,
      seated_at: now,
      notification_status: 'sent',
      last_notification_sent: now,
    });

    // Notify staff associated with the branch
    const staff = await Staff.findAll({
      where: { merchant_id: booking.merchant_id },
      include: [{ model: User, as: 'user' }],
    });
    const staffPhones = staff.map(s => s.user?.phone).filter(Boolean);

    await this.notificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'staff_checkin_alert' },
      content: `Customer ${booking.customer_id} has checked in at table ${booking.table.table_number} (Booking: ${booking.reference})`,
      recipient: staffPhones.length > 0 ? staffPhones[0] : process.env.DEFAULT_STAFF_PHONE,
    });

    logApiEvent('Customer checked in', { userId, bookingId, tableId: booking.table_id });

    const waitTimeEstimate = await this.estimateWaitTime(booking.branch_id);

    return { booking, waitTimeEstimate };
  }

  /**
   * Estimate wait time based on branch table availability
   * @param {number} branchId - The branch ID
   * @returns {Promise<number>} - Estimated wait time in minutes
   */
  async estimateWaitTime(branchId) {
    const availableTables = await Table.count({
      where: { branch_id: branchId, status: 'available' },
    });
    const pendingBookings = await Booking.count({
      where: { branch_id: branchId, status: ['pending', 'approved'] },
    });
    return availableTables > 0 ? 0 : pendingBookings * 15; // 15 minutes per pending booking
  }

  /**
   * Request staff assistance for a table
   * @param {number} userId - The ID of the user requesting assistance
   * @param {number} tableId - The ID of the table
   * @param {string} requestType - Type of request (e.g., 'assistance', 'order')
   * @returns {Promise<Object>} - Notification details
   */
  async callStaff(userId, tableId, requestType) {
    const table = await Table.findOne({
      where: { id: tableId, status: { [Op.in]: ['occupied', 'reserved'] } },
    });
    if (!table) throw new AppError('Table not found or not in use', 404, 'TABLE_NOT_FOUND');

    const activeOrder = await InDiningOrder.findOne({
      where: {
        table_id: tableId,
        customer_id: { [Op.in]: sequelize.literal(`(SELECT id FROM customers WHERE user_id = ${userId})`) },
        status: ['pending', 'confirmed', 'preparing', 'served'],
      },
    });
    if (!activeOrder) throw new AppError('No active order found for this table', 403, 'NO_ACTIVE_ORDER');

    const staff = await Staff.findAll({
      where: { merchant_id: table.branch_id },
      include: [{ model: User, as: 'user' }],
    });
    const staffPhones = staff.map(s => s.user?.phone).filter(Boolean);

    const notification = await Notification.create({
      user_id: userId,
      type: 'staff_request',
      message: `Assistance requested at table ${table.table_number}: ${requestType}`,
      priority: 'MEDIUM',
    });

    await this.notificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'staff_assistance_request' },
      content: `Assistance requested at table ${table.table_number} by user ${userId}: ${requestType}`,
      recipient: staffPhones.length > 0 ? staffPhones[0] : process.env.DEFAULT_STAFF_PHONE,
    });

    logApiEvent('Staff assistance requested', { userId, tableId, requestType });

    return { notification };
  }

  /**
   * Request the bill for an in-dining order
   * @param {number} userId - The ID of the user requesting the bill
   * @param {number} inDiningOrderId - The ID of the in-dining order
   * @param {Object} paymentMethod - Payment method details (e.g., { type: 'MOBILE_MONEY', provider: 'Airtel' })
   * @param {number[]} [splitWith] - Optional array of user IDs to split the bill with
   * @returns {Promise<Object>} - Payment details
   */
  async requestBill(userId, inDiningOrderId, paymentMethod, splitWith = []) {
    const order = await InDiningOrder.findOne({
      where: { id: inDiningOrderId },
      include: [
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table' },
      ],
    });
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    if (order.customer.user_id !== userId) throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    if (order.payment_status !== 'unpaid') throw new AppError('Bill already processed', 400, 'BILL_ALREADY_PAID');

    const customer = await Customer.findOne({ where: { user_id: userId } });
    const phoneNumber = customer.phone_number;

    let payment;
    if (splitWith.length > 0) {
      const totalParticipants = splitWith.length + 1;
      const splitAmount = order.total_amount / totalParticipants;

      payment = await Promise.all(
        [userId, ...splitWith].map(async (uid) => {
          const splitCustomer = await Customer.findOne({ where: { user_id: uid } });
          if (!splitCustomer) throw new AppError(`Customer with user ID ${uid} not found`, 404, 'CUSTOMER_NOT_FOUND');

          return this.paymentService.initiateMobileMoneyPayment({
            amount: splitAmount,
            provider: paymentMethod.provider,
            customer_id: splitCustomer.id,
            order_id: inDiningOrderId,
            merchant_id: order.branch.merchant_id,
            phone_number: splitCustomer.phone_number,
          });
        })
      );
    } else {
      payment = await this.paymentService.initiateMobileMoneyPayment({
        amount: order.total_amount,
        provider: paymentMethod.provider,
        customer_id: customer.id,
        order_id: inDiningOrderId,
        merchant_id: order.branch.merchant_id,
        phone_number,
      });
    }

    await order.update({ payment_status: 'pending' });

    const staff = await Staff.findAll({
      where: { merchant_id: order.branch.merchant_id },
      include: [{ model: User, as: 'user' }],
    });
    const staffPhones = staff.map(s => s.user?.phone).filter(Boolean);

    await this.notificationService.sendThroughChannel('WHATSAPP', {
      notification: { templateName: 'staff_bill_request' },
      content: `Bill requested for table ${order.table.table_number} (Order: ${order.order_number})`,
      recipient: staffPhones.length > 0 ? staffPhones[0] : process.env.DEFAULT_STAFF_PHONE,
    });

    logTransactionEvent('Bill requested', { userId, inDiningOrderId, paymentMethod, splitWith });

    return { payment };
  }
}

module.exports = new QuickLinkService();