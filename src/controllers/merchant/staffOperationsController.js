'use strict';

const MerchantStaffOperationsService = require('@services/merchant/merchantStaffOperationsService');
const { logger } = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');

class StaffOperationsController {
  constructor(io) {
    this.staffOperationsService = new MerchantStaffOperationsService(io);
  }

  recruitStaff = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const staffData = req.body;
    const result = await this.staffOperationsService.recruitStaff(merchantId, staffData, req);
    res.status(201).json({
      status: 'success',
      data: result,
    });
  });

  updateStaffRole = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const updates = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.staffOperationsService.updateStaffRole(merchantId, staffId, updates, token);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  removeStaff = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const token = req.headers.authorization.split(' ')[1];
    const result = await this.staffOperationsService.removeStaff(merchantId, staffId, token);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  assignStaffToTask = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId, taskType, taskId } = req.params;
    const geoData = req.body.geoData;
    const result = await this.staffOperationsService.assignStaffToTask(merchantId, staffId, taskType, taskId, geoData);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getStaffTasks = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const tasks = await this.staffOperationsService.getStaffTasks(merchantId, staffId);
    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  });

  manageStaffAvailability = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const { availabilityStatus } = req.body;
    const result = await this.staffOperationsService.manageStaffAvailability(merchantId, staffId, availabilityStatus);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getStaffPerformance = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const { period } = req.query;
    const performance = await this.staffOperationsService.getStaffPerformance(merchantId, staffId, period);
    res.status(200).json({
      status: 'success',
      data: performance,
    });
  });

  generateStaffReport = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { period } = req.query;
    const report = await this.staffOperationsService.generateStaffReport(merchantId, period);
    res.status(200).json({
      status: 'success',
      data: report,
    });
  });
}

module.exports = (io) => new StaffOperationsController(io);