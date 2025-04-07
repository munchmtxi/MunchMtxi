'use strict';

const StaffManagementService = require('@services/staff/StaffManagementService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');

class StaffController {
  async getBookings(req, res, next) {
    try {
      const { staffId } = req.user; // Assumes JWT middleware sets req.user
      const { period, startDate } = req.query;
      const bookings = await StaffManagementService.getBookingsForStaff(staffId, period, startDate ? new Date(startDate) : undefined);
      res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      logger.error('Error fetching bookings', { error: error.message, staffId: req.user.staffId });
      next(error instanceof AppError ? error : new AppError('Failed to fetch bookings', 500));
    }
  }

  async handleBookingNotification(req, res, next) {
    try {
      const { bookingId } = req.body;
      await StaffManagementService.handleBookingNotification(bookingId);
      res.status(200).json({ success: true, message: 'Booking notification handled' });
    } catch (error) {
      logger.error('Error handling booking notification', { error: error.message, bookingId: req.body.bookingId });
      next(error instanceof AppError ? error : new AppError('Failed to handle booking notification', 500));
    }
  }

  async handleOrderNotification(req, res, next) {
    try {
      const { orderId } = req.body;
      await StaffManagementService.handleInDiningOrderNotification(orderId);
      res.status(200).json({ success: true, message: 'Order notification handled' });
    } catch (error) {
      logger.error('Error handling order notification', { error: error.message, orderId: req.body.orderId });
      next(error instanceof AppError ? error : new AppError('Failed to handle order notification', 500));
    }
  }

  async handleQuickLinkRequest(req, res, next) {
    try {
      const { staffId } = req.user;
      const { notificationId } = req.body;
      const result = await StaffManagementService.handleQuickLinkRequest(staffId, notificationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Error handling quick link request', { error: error.message, staffId: req.user.staffId, notificationId: req.body.notificationId });
      next(error instanceof AppError ? error : new AppError('Failed to handle quick link request', 500));
    }
  }

  async handleSubscriptionNotification(req, res, next) {
    try {
      const { subscriptionId } = req.body;
      await StaffManagementService.handleSubscriptionNotification(subscriptionId);
      res.status(200).json({ success: true, message: 'Subscription notification handled' });
    } catch (error) {
      logger.error('Error handling subscription notification', { error: error.message, subscriptionId: req.body.subscriptionId });
      next(error instanceof AppError ? error : new AppError('Failed to handle subscription notification', 500));
    }
  }

  async handlePaymentNotification(req, res, next) {
    try {
      const { paymentId } = req.body;
      await StaffManagementService.handlePaymentNotification(paymentId);
      res.status(200).json({ success: true, message: 'Payment notification handled' });
    } catch (error) {
      logger.error('Error handling payment notification', { error: error.message, paymentId: req.body.paymentId });
      next(error instanceof AppError ? error : new AppError('Failed to handle payment notification', 500));
    }
  }
}

module.exports = new StaffController();