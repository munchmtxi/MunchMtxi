'use strict';

const MerchantStaffOperationsService = require('@services/merchant/merchantStaffOperationsService');
const PerformanceIncentiveService = require('@services/staff/performanceIncentiveService');
const { logger } = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');
const { Staff, Booking, InDiningOrder, Order, Feedback, User } = require('@models');

class StaffOperationsController {
  constructor(io) {
    this.staffOperationsService = new MerchantStaffOperationsService(io);
    this.performanceIncentiveService = new PerformanceIncentiveService(io);
  }

  recruitStaff = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const staffData = req.body;
    const { staff, tempPassword } = await this.staffOperationsService.recruitStaff(merchantId, staffData);
    res.status(201).json({
      status: 'success',
      data: {
        staff: {
          id: staff.id,
          first_name: staffData.first_name,
          last_name: staffData.last_name,
          email: staffData.email,
          phone: staffData.phone,
          position: staff.position,
          branch_id: staff.branch_id,
          tempPassword, // Remove or secure in production
        },
      },
    });
  });

  updateStaffRole = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const updates = req.body;
    const staff = await this.staffOperationsService.updateStaffRole(merchantId, staffId, updates);
    res.status(200).json({
      status: 'success',
      data: {
        staff: {
          id: staff.id,
          position: staff.position,
          branch_id: staff.branch_id,
        },
      },
    });
  });

  removeStaff = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId } = req.params;
    const result = await this.staffOperationsService.removeStaff(merchantId, staffId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  assignStaffToTask = catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchantId;
    const { staffId, taskType, taskId } = req.params;
    const geoData = req.body.geoData;
    const task = await this.staffOperationsService.assignStaffToTask(merchantId, staffId, taskType, taskId);
    res.status(200).json({
      status: 'success',
      data: task,
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

  // Corrected /report handler using calculatePointsFromMetrics
  getStaffReport = catchAsync(async (req, res, next) => {
    const { merchantId } = req.params;
    try {
      const thirtyDaysAgo = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);

      const staffList = await Staff.findAll({
        where: { merchant_id: merchantId, deleted_at: null },
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'phone'] }],
      });

      const report = await Promise.all(
        staffList.map(async (staff) => {
          const bookingsCompleted = await Booking.count({
            where: { 
              staff_id: staff.id, 
              status: 'seated', 
              seated_at: { [Op.gte]: thirtyDaysAgo }
            },
          });
          const inDiningOrdersClosed = await InDiningOrder.count({
            where: { 
              staff_id: staff.id, 
              status: 'closed', 
              updated_at: { [Op.gte]: thirtyDaysAgo }
            },
          });
          const takeawayOrdersPrepared = await Order.count({
            where: { 
              staff_id: staff.id, 
              status: 'ready', 
              order_number: { [Op.notLike]: 'SUB%' }, 
              updated_at: { [Op.gte]: thirtyDaysAgo }
            },
          });
          const subscriptionOrdersPrepared = await Order.count({
            where: { 
              staff_id: staff.id, 
              status: 'ready', 
              order_number: { [Op.like]: 'SUB%' }, 
              updated_at: { [Op.gte]: thirtyDaysAgo }
            },
          });
          const feedback = await Feedback.findAll({
            where: { 
              staff_id: staff.id, 
              created_at: { [Op.gte]: thirtyDaysAgo }
            },
          });
          const averageRating = feedback.length ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;

          const metrics = {
            bookingsCompleted,
            inDiningOrdersClosed,
            takeawayOrdersPrepared,
            subscriptionOrdersPrepared,
          };
          const points = this.performanceIncentiveService.calculatePointsFromMetrics(metrics);

          return {
            staffId: staff.id,
            name: `${staff.user.first_name} ${staff.user.last_name}`,
            bookingsCompleted,
            inDiningOrdersClosed,
            takeawayOrdersPrepared,
            subscriptionOrdersPrepared,
            averageRating,
            points,
          };
        })
      );

      res.status(200).json({ status: 'success', data: report });
    } catch (error) {
      logger.error('Error generating staff report', { error: error.message, merchantId });
      next(error); // Pass to error middleware
    }
  });
}

module.exports = (io) => new StaffOperationsController(io);
