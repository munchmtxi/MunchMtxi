// src/services/merchant/merchantCustomerOperationsService.js
'use strict';

const { 
  Booking, 
  Table, 
  InDiningOrder, 
  Order, 
  Subscription, 
  Customer, 
  MenuInventory, 
  Payment, 
  MerchantBranch,
  Feedback,
  Staff,
  User
} = require('@models');
const bookingService = require('@services/customer/bookingService');
const InDiningOrderService = require('@services/customer/inDiningOrderService');
const OrderService = require('@services/customer/orderService');
const { SubscriptionService } = require('@services/customer/subscriptionService');
const MerchantStaffOperationsService = require('@services/merchant/merchantStaffOperationsService');
const NotificationService = require('@services/notifications/core/notificationService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const { Op } = require('sequelize');

class MerchantCustomerOperationsService {
  constructor(io) {
    this.io = io;
    this.bookingService = bookingService;
    this.inDiningOrderService = new InDiningOrderService(io);
    this.orderService = OrderService;
    this.subscriptionService = new SubscriptionService();
    this.staffOperationsService = new MerchantStaffOperationsService(io);
    this.notificationService = new NotificationService(io);
  }

  // Helper method for period start date
  getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1)); // Default to month
    }
  }

  // --- Booking Management ---

  async getBookings(merchantId, statusFilter = ['pending', 'approved', 'seated'], token) {
    logger.info('getBookings called', { merchantId, statusFilter, token });
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      if (isNaN(merchantIdNum)) {
        throw new AppError('Invalid merchant ID', 400);
      }
      const bookings = await Booking.findAll({
        where: { 
          merchant_id: merchantIdNum, 
          status: { [Op.in]: statusFilter } 
        },
        include: [
          { model: Table, as: 'table' },
          { model: Customer, as: 'customer' }
        ],
      });
      return bookings;
    } catch (error) {
      logger.error('Error retrieving bookings', { error: error.message, merchantId });
      throw new AppError('Failed to retrieve bookings', 500);
    }
  }

  async assignStaffToBooking(merchantId, bookingId, staffId, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const booking = await Booking.findByPk(bookingId);
      if (!booking || booking.merchant_id !== merchantIdNum) {
        throw new AppError('Booking not found or not under this merchant', 404);
      }
      const staff = await Staff.findByPk(staffId);
      if (!staff || staff.merchant_id !== merchantIdNum) {
        throw new AppError('Staff not found or not under this merchant', 404);
      }
      await Booking.update({ staff_id: staffId }, { where: { id: bookingId } });
      this.io.to(`merchant:${merchantId}`).emit('bookingAssigned', { bookingId, staffId });
      logger.info('Staff assigned to booking', { merchantId, bookingId, staffId });
      return { success: true, bookingId, staffId };
    } catch (error) {
      logger.error('Error assigning staff to booking', { error: error.message, merchantId, bookingId });
      throw new AppError('Failed to assign staff to booking', 500);
    }
  }

  // --- Table Management ---

  async assignStaffToTable(merchantId, tableId, staffId, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const table = await Table.findByPk(tableId, { include: [{ model: MerchantBranch, as: 'branch' }] });
      if (!table || table.branch.merchant_id !== merchantIdNum) {
        throw new AppError('Table not found or not under this merchant', 404);
      }
      const staff = await Staff.findByPk(staffId);
      if (!staff || staff.merchant_id !== merchantIdNum) {
        throw new AppError('Staff not found or not under this merchant', 404);
      }
      await Table.update({ staff_id: staffId }, { where: { id: tableId } });
      this.io.to(`branch:${table.branch_id}`).emit('tableStaffUpdate', { tableId, staffId });
      logger.info('Staff assigned to table', { merchantId, tableId, staffId });
      return { success: true, tableId, staffId };
    } catch (error) {
      logger.error('Error assigning staff to table', { error: error.message, merchantId, tableId });
      throw new AppError('Failed to assign staff to table', 500);
    }
  }

  // --- Order Management ---

  async manageInDiningOrder(merchantId, orderId, { staffId, paymentData, status, close = false }, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const order = await InDiningOrder.findByPk(orderId, { 
        include: [{ model: MerchantBranch, as: 'branch' }]
      });
      if (!order) {
        throw new AppError('In-dining order not found', 404);
      }
      if (order.branch.merchant_id !== merchantIdNum) {
        throw new AppError('Order not under this merchant', 403);
      }
      const updates = {};
      
      if (staffId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff || staff.merchant_id !== merchantIdNum) {
          throw new AppError('Staff not found or not under this merchant', 404);
        }
        updates.staff_id = staffId;
        this.io.to(`order:${orderId}`).emit('staffAssigned', { orderId, staffId });
      }
  
      if (paymentData) {
        const { amount, method } = paymentData;
        if (!amount || !method) {
          throw new AppError('Payment amount and method are required', 400);
        }
        if (amount !== order.total_amount) {
          throw new AppError('Payment amount must match order total', 400);
        }
        const payment = await Payment.create({
          in_dining_order_id: orderId,
          order_id: null,
          customer_id: order.customer_id,
          merchant_id: merchantIdNum,
          staff_id: staffId || null,
          amount,
          payment_method: method,
          status: 'pending',
          provider: method === 'cash' ? 'Cash' : null,
          created_at: new Date(),
          updated_at: new Date()
        });
  
        if (method === 'cash') {
          // Cash payment: No external processing needed
          await payment.update({ status: 'completed' });
        } else {
          // Non-cash payment: Call payOrder for external processing
          const paymentResult = await this.inDiningOrderService.payOrder(orderId, order.customer_id, paymentData);
          if (!paymentResult.success) {
            await payment.update({ status: 'failed' });
            throw new AppError('Payment processing failed', 400);
          }
          await payment.update({ 
            status: 'completed',
            transaction_id: paymentResult.transactionId || null 
          });
        }
        updates.payment_status = 'paid';
        this.io.to(`order:${orderId}`).emit('orderUpdated', { orderId, paymentStatus: 'paid', paymentId: payment.id });
      }
  
      if (status && ['pending', 'confirmed', 'preparing', 'served', 'closed', 'cancelled'].includes(status)) {
        updates.status = status;
        if (status === 'closed' || close) {
          await this.inDiningOrderService.closeOrder(orderId);
          updates.status = 'closed';
          await Table.update({ status: 'available' }, { where: { id: order.table_id } });
          this.io.to(`branch:${order.branch_id}`).emit('tableStatusUpdate', { tableId: order.table_id, status: 'available' });
        }
      }
  
      if (Object.keys(updates).length > 0) {
        await InDiningOrder.update(updates, { where: { id: orderId } });
      }
  
      logger.info('In-dining order managed', { merchantId, orderId, updates });
      return { success: true, orderId };
    } catch (error) {
      logger.error('Error managing in-dining order', { error: error.message, merchantId, orderId });
      throw new AppError(error.message || 'Failed to manage in-dining order', error.statusCode || 500);
    }
  }

  async manageTakeawayOrder(merchantId, orderId, { staffId, markReady }, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const order = await Order.findByPk(orderId);
      if (!order || order.merchant_id !== merchantIdNum) {
        throw new AppError('Order not found or not under this merchant', 404);
      }
      if (order.order_number.startsWith('SUB')) {
        throw new AppError('Order is a subscription order, use subscription endpoint', 400);
      }
  
      const updates = {};
      let staff = null;
      if (staffId) {
        staff = await Staff.findByPk(staffId);
        if (!staff || staff.merchant_id !== merchantIdNum) {
          throw new AppError('Staff not found or not under this merchant', 404);
        }
        updates.staff_id = staffId;
        this.io.to(`order:${orderId}`).emit('staffAssigned', { orderId, staffId });
      }
      if (markReady) {
        updates.status = 'ready';
        logger.info('Order marked as ready', { order_id: orderId });
        this.io.to(`order:${orderId}`).emit('orderUpdated', { orderId, status: 'ready' });
      }
  
      if (Object.keys(updates).length > 0) {
        await Order.update(updates, { where: { id: orderId } });
        // Optional: Notify customer (handle missing user_id)
        if (staff && this.notificationService) {
          try {
            const userId = staff.user_id || null; // Fallback to null if undefined
            if (userId) {
              await this.notificationService.notify(userId, `Order ${orderId} updated`);
            }
          } catch (notifyError) {
            logger.error('Failed to send notification', { error: notifyError.message });
            // Don’t throw here—notification failure shouldn’t fail the request
          }
        }
      }
  
      logger.info('Takeaway order managed', { merchantId, orderId, updates });
      return { success: true };
    } catch (error) {
      logger.error('Error managing takeaway order', { error: error.message, merchantId, orderId });
      throw new AppError(error.message || 'Failed to manage takeaway order', error.statusCode || 500);
    }
  }

  async fulfillSubscriptionOrder(merchantId, orderId, staffId, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const order = await Order.findByPk(orderId);
      if (!order || order.merchant_id !== merchantIdNum) {
        throw new AppError('Order not found or not under this merchant', 404);
      }
      if (!order.order_number.startsWith('SUB')) {
        throw new AppError('Order is not a subscription order', 400);
      }
  
      const staff = await Staff.findByPk(staffId);
      if (!staff || staff.merchant_id !== merchantIdNum) {
        throw new AppError('Staff not found or not under this merchant', 404);
      }
  
      await Order.update(
        { staff_id: staffId, status: 'completed' }, // Changed from 'fulfilled' to 'completed'
        { where: { id: orderId } }
      );
  
      // Optional WhatsApp notification
      if (this.notificationService && this.notificationService.whatsApp) {
        try {
          const customerId = order.customer_id;
          await this.notificationService.whatsApp.sendTemplateMessage({
            to: customerId,
            template: 'order_fulfilled',
            params: { orderId }
          });
          logger.info('WhatsApp notification sent', { orderId });
        } catch (notifyError) {
          logger.error('Failed to send WHATSAPP notification', { error: notifyError.message });
        }
      }
  
      logger.info('Subscription order fulfilled', { merchantId, orderId, staffId });
      return { success: true };
    } catch (error) {
      logger.error('Error fulfilling subscription order', { error: error.message, merchantId, orderId });
      throw new AppError(error.message || 'Failed to fulfill subscription order', error.statusCode || 500);
    }
  }

  // --- Distance Calculation ---

  async calculateBranchDistance(merchantId, branchId, customerLocation, token) {
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch || branch.merchant_id !== merchantIdNum) {
        throw new AppError('Branch not found or not under this merchant', 404);
      }
      // Placeholder for actual distance calculation (e.g., using Google Maps API)
      const branchLocation = branch.location; // Assuming location is stored as { lat, lng }
      const distance = this.calculateDistance(branchLocation, customerLocation); // Implement this
      logger.info('Branch distance calculated', { merchantId, branchId, distance });
      return { distance };
    } catch (error) {
      logger.error('Error calculating branch distance', { error: error.message, merchantId, branchId });
      throw new AppError('Failed to calculate branch distance', 500);
    }
  }

  calculateDistance(location1, location2) {
    // Mock implementation for testing
    return { value: 5.0, unit: 'km' }; // Replace with real geolocation API if available
  }

  // --- Feedback Management ---

  async getStaffFeedback(merchantId, staffId, period = 'month', token) {
    logger.info('getStaffFeedback version check', { version: 'updated' });
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      if (isNaN(merchantIdNum)) {
        throw new AppError('Invalid merchant ID', 400);
      }
  
      const staff = await Staff.findByPk(staffId);
      if (!staff || staff.merchant_id !== merchantIdNum) {
        throw new AppError('Staff not found or not under this merchant', 404);
      }
  
      const dateRange = period === 'month'
        ? { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
        : period === 'week'
        ? { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 7)) }
        : null;
  
      const feedback = await Feedback.findAll({
        where: {
          staff_id: staffId,
          ...(dateRange ? { created_at: dateRange } : {}),
          deleted_at: null
        },
        include: [{ model: User, as: 'customer', required: false }] // Fix: Use User instead of Customer
      });
  
      logger.info('Staff feedback retrieved', { merchantId, staffId, count: feedback.length });
      return feedback.length > 0 ? feedback : { message: 'No feedback found', data: [] };
    } catch (error) {
      logger.error('Error in getStaffFeedback', { 
        error: error.message, 
        stack: error.stack, 
        merchantId, 
        staffId 
      });
      throw new AppError(error.message || 'Failed to retrieve staff feedback', error.statusCode || 500);
    }
  }

  // --- Performance Reports ---

  async generatePerformanceReport(merchantId, period = 'month', token) {
    // Existing implementation remains unchanged
    try {
      const merchantIdNum = parseInt(merchantId, 10);
      const startDate = this.getPeriodStart(period);
      const orders = await Order.findAll({
        where: {
          merchant_id: merchantIdNum,
          created_at: { [Op.gte]: startDate }
        }
      });
      const report = {
        totalOrders: orders.length,
        revenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        period
      };
      logger.info('Performance report generated', { merchantId, period });
      return report;
    } catch (error) {
      logger.error('Error generating performance report', { error: error.message, merchantId });
      throw new AppError('Failed to generate performance report', 500);
    }
  }
}

module.exports = MerchantCustomerOperationsService;