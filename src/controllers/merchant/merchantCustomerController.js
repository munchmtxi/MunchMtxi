'use strict';

const MerchantCustomerOperationsService = require('@services/merchant/merchantCustomerOperationsService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class MerchantCustomerController {
  constructor(io) {
    this.service = new MerchantCustomerOperationsService(io);
  }

  getBookings = catchAsync(async (req, res) => {
    const merchantId = req.merchant.id;
    const { statusFilter } = req.query;
    const token = req.token; // Use centralized token
    logger.info('Controller: getBookings', { merchantId, params: req.params, query: req.query, merchant: req.merchant });
    const bookings = await this.service.getBookings(merchantId, statusFilter?.split(',') || ['pending', 'approved', 'seated'], token);
    logger.info('Bookings fetched', { merchantId, count: bookings.length });
    res.status(200).json({ status: 'success', data: bookings });
  });

  assignStaffToBooking = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const { bookingId, staffId } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.service.assignStaffToBooking(merchantId, bookingId, staffId, token);
    logger.info('Staff assigned to booking', { merchantId, bookingId, staffId });
    res.status(200).json({ status: 'success', data: result });
  });

  assignStaffToTable = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const { tableId, staffId } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.service.assignStaffToTable(merchantId, tableId, staffId, token);
    logger.info('Staff assigned to table', { merchantId, tableId, staffId });
    res.status(200).json({ status: 'success', data: result });
  });

  manageInDiningOrder = catchAsync(async (req, res) => {
    const { merchantId, orderId } = req.params;
    const { staffId, paymentData, close } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.service.manageInDiningOrder(merchantId, orderId, { staffId, paymentData, close }, token);
    logger.info('In-dining order managed', { merchantId, orderId });
    res.status(200).json({ status: 'success', data: result });
  });

  getStaffFeedback = catchAsync(async (req, res) => {
    const { merchantId, staffId } = req.params;
    const { period } = req.query;
    const token = req.headers.authorization.split(' ')[1];
    const feedback = await this.service.getStaffFeedback(merchantId, staffId, period || 'month', token);
    logger.info('Staff feedback retrieved', { merchantId, staffId });
    res.status(200).json({ 
      status: 'success', 
      data: Array.isArray(feedback) ? feedback : feedback.data, 
      message: feedback.message || null 
    });
  });

  manageTakeawayOrder = catchAsync(async (req, res) => {
    const { merchantId, orderId } = req.params;
    const { staffId, markReady, driverId } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.service.manageTakeawayOrder(merchantId, orderId, { staffId, markReady, driverId }, token);
    logger.info('Takeaway order managed', { merchantId, orderId });
    res.status(200).json({ status: 'success', data: result });
  });

  fulfillSubscriptionOrder = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const { orderId, staffId } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.service.fulfillSubscriptionOrder(merchantId, orderId, staffId, token);
    logger.info('Subscription order fulfilled', { merchantId, orderId });
    res.status(200).json({ status: 'success', data: result });
  });

  calculateBranchDistance = catchAsync(async (req, res) => {
    const { merchantId, branchId } = req.params;
    const { customerLocation } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const distance = await this.service.calculateBranchDistance(merchantId, branchId, customerLocation, token);
    logger.info('Branch distance calculated', { merchantId, branchId });
    res.status(200).json({ status: 'success', data: distance });
  });

  generatePerformanceReport = catchAsync(async (req, res) => {
    const { merchantId } = req.params;
    const { period } = req.query;
    const token = req.headers.authorization.split(' ')[1];
    const report = await this.service.generatePerformanceReport(merchantId, period || 'month', token);
    logger.info('Performance report generated', { merchantId, period });
    res.status(200).json({ status: 'success', data: report });
  });
}

module.exports = (io) => new MerchantCustomerController(io);