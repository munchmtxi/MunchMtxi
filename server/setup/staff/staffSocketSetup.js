'use strict';

const { logger } = require('@utils/logger');
const StaffManagementService = require('@services/staff/StaffManagementService');
const STAFF_EVENTS = require('@config/events/staff/profile/events');

module.exports = (io, socket) => {
  logger.info('Setting up staff socket handlers', { socketId: socket.id });

  socket.on(STAFF_EVENTS.STAFF.BOOKING_NOTIFICATION, async (data) => {
    try {
      const { bookingId } = data;
      await StaffManagementService.handleBookingNotification(bookingId);
      socket.emit(STAFF_EVENTS.STAFF.SUCCESS, { message: 'Booking notification processed', bookingId });
    } catch (error) {
      logger.error('Error in booking notification handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: error.message, code: 'BOOKING_NOTIFICATION_ERROR' });
    }
  });

  socket.on(STAFF_EVENTS.STAFF.ORDER_NOTIFICATION, async (data) => {
    try {
      const { orderId } = data;
      await StaffManagementService.handleInDiningOrderNotification(orderId);
      socket.emit(STAFF_EVENTS.STAFF.SUCCESS, { message: 'Order notification processed', orderId });
    } catch (error) {
      logger.error('Error in order notification handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: error.message, code: 'ORDER_NOTIFICATION_ERROR' });
    }
  });

  socket.on(STAFF_EVENTS.STAFF.QUICK_LINK_REQUEST, async (data) => {
    try {
      const { notificationId } = data;
      const staffId = socket.user.staff_profile.id; // Assumes staff_profile from User association
      const result = await StaffManagementService.handleQuickLinkRequest(staffId, notificationId);
      socket.emit(STAFF_EVENTS.STAFF.SUCCESS, { message: 'Quick link request processed', notificationId, data: result });
    } catch (error) {
      logger.error('Error in quick link request handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: error.message, code: 'QUICK_LINK_ERROR' });
    }
  });

  socket.on(STAFF_EVENTS.STAFF.SUBSCRIPTION_NOTIFICATION, async (data) => {
    try {
      const { subscriptionId } = data;
      await StaffManagementService.handleSubscriptionNotification(subscriptionId);
      socket.emit(STAFF_EVENTS.STAFF.SUCCESS, { message: 'Subscription notification processed', subscriptionId });
    } catch (error) {
      logger.error('Error in subscription notification handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: error.message, code: 'SUBSCRIPTION_NOTIFICATION_ERROR' });
    }
  });

  socket.on(STAFF_EVENTS.STAFF.PAYMENT_NOTIFICATION, async (data) => {
    try {
      const { paymentId } = data;
      await StaffManagementService.handlePaymentNotification(paymentId);
      socket.emit(STAFF_EVENTS.STAFF.SUCCESS, { message: 'Payment notification processed', paymentId });
    } catch (error) {
      logger.error('Error in payment notification handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: error.message, code: 'PAYMENT_NOTIFICATION_ERROR' });
    }
  });
};