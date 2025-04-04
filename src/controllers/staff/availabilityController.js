'use strict';

const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const AvailabilityShiftService = require('@services/staff/AvailabilityShiftService');

class AvailabilityController {
  constructor(io, notificationService) {
    this.service = new AvailabilityShiftService(io);
    this.service.setNotificationService(notificationService);
  }

  async setAvailability(req, res, next) {
    try {
      const { staffId } = req.user;
      const { status } = req.body;
      const updatedStaff = await this.service.setAvailabilityStatus(staffId, status);
      res.status(200).json({
        status: 'success',
        data: { staff: updatedStaff },
      });
    } catch (error) {
      logger.error('Set availability failed', { error: error.message });
      next(error);
    }
  }

  async assignStaff(req, res, next) {
    try {
      const { staffId } = req.user;
      const { entityId, entityType } = req.body;
      const entity = { id: entityId, type: entityType };
      const updatedEntity = await this.service.assignStaffToBooking(staffId, entity);
      res.status(200).json({
        status: 'success',
        data: { entity: updatedEntity },
      });
    } catch (error) {
      logger.error('Assign staff failed', { error: error.message });
      next(error);
    }
  }

  async getAvailableStaff(req, res, next) {
    try {
      const { branchId } = req.user;
      const { bookingDate, bookingTime } = req.query;
      const staff = await this.service.getAvailableStaff(branchId, bookingDate, bookingTime);
      res.status(200).json({
        status: 'success',
        data: { staff },
      });
    } catch (error) {
      logger.error('Get available staff failed', { error: error.message });
      next(error);
    }
  }
}

module.exports = AvailabilityController;