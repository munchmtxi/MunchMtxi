'use strict';

const StaffCustomerService = require('@services/staff/staffCustomerService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class StaffCustomerController {
  constructor(io, whatsappService, emailService, smsService) {
    this.service = new StaffCustomerService(io, whatsappService, emailService, smsService);
  }

  async checkIn(req, res, next) {
    try {
      const { bookingId } = req.params;
      const staffId = req.user.staffId; // From staff auth middleware
      const booking = await this.service.handleCheckIn(bookingId, staffId);
      logger.info('Staff check-in successful', { bookingId, staffId });
      res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async requestAssistance(req, res, next) {
    try {
      const { tableId, requestType } = req.body;
      const staffId = req.user.staffId;
      if (!tableId || !requestType) throw new AppError('Table ID and request type are required', 400, 'MISSING_FIELDS');
      const notification = await this.service.handleAssistanceRequest(tableId, requestType, staffId);
      logger.info('Staff assistance requested', { tableId, requestType, staffId });
      res.status(200).json({
        status: 'success',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  async processBill(req, res, next) {
    try {
      const { orderId } = req.params;
      const { paymentMethod, splitWith } = req.body;
      const staffId = req.user.staffId;
      if (!paymentMethod || !paymentMethod.type || !paymentMethod.provider) {
        throw new AppError('Valid payment method is required', 400, 'INVALID_PAYMENT_METHOD');
      }
      const order = await this.service.processBill(orderId, staffId, paymentMethod, splitWith);
      logger.info('Staff processed bill', { orderId, staffId });
      res.status(200).json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StaffCustomerController;