// src/services/merchant/staff/merchantStaffOperationsService.js
'use strict';

const { Staff, User, MerchantBranch, Booking, InDiningOrder, Order, Subscription, Feedback } = require('@models');
const StaffManagementService = require('@services/staff/staffManagementService');
const AvailabilityShiftService = require('@services/staff/availabilityShiftService');
const PerformanceIncentiveService = require('@services/staff/performanceIncentiveService');
const NotificationService = require('@services/notifications/core/notificationService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const { Op } = require('sequelize');

class MerchantStaffOperationsService {
  constructor(io) {
    this.io = io;
    this.staffManagementService = StaffManagementService;
    this.availabilityShiftService = new AvailabilityShiftService();
    this.performanceIncentiveService = new PerformanceIncentiveService(io);
    this.notificationService = new NotificationService(io);
  }

  // Recruit new staff
  async recruitStaff(merchantId, staffData) {
    try {
      const { first_name, last_name, email, phone, position, branch_id } = staffData;
      const user = await User.create({
        first_name,
        last_name,
        email,
        phone,
        role_id: 4, // Staff role
        merchant_id: merchantId,
      });
      const staff = await Staff.create({
        user_id: user.id,
        merchant_id: merchantId,
        position,
        branch_id,
        availability_status: 'offline',
      });

      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: { templateName: 'staff_welcome' },
        content: `Welcome to the team, ${first_name}! Your role: ${position}`,
        recipient: phone,
      });

      this.io.to(`merchant:${merchantId}`).emit('staffRecruited', { staffId: staff.id, name: user.getFullName() });
      logger.info('Staff recruited', { merchantId, staffId: staff.id });
      return staff;
    } catch (error) {
      logger.error('Error recruiting staff', { error: error.message, merchantId });
      throw new AppError('Failed to recruit staff', 500);
    }
  }

  // Update staff role or branch assignment
  async updateStaffRole(merchantId, staffId, updates) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId }, include: [{ model: User }] });
      if (!staff) throw new AppError('Staff not found', 404);

      const { position, branch_id } = updates;
      await staff.update({ position, branch_id });

      this.io.to(`branch:${branch_id}`).emit('staffRoleUpdated', { staffId, position });
      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: { templateName: 'staff_role_update' },
        content: `Your role has been updated to ${position} at branch ${branch_id}`,
        recipient: staff.user.phone,
      });

      logger.info('Staff role updated', { merchantId, staffId, position });
      return staff;
    } catch (error) {
      logger.error('Error updating staff role', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to update staff role', 500);
    }
  }

  // Remove staff and reassign tasks
  async removeStaff(merchantId, staffId) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId } });
      if (!staff) throw new AppError('Staff not found', 404);

      const activeTasks = await this.getStaffTasks(merchantId, staffId);
      for (const task of [...activeTasks.bookings, ...activeTasks.inDiningOrders, ...activeTasks.takeawayOrders, ...activeTasks.subscriptionOrders]) {
        const availableStaff = await this.staffManagementService.findAvailableStaff(merchantId, task.branch_id);
        if (availableStaff) {
          await task.update({ staff_id: availableStaff.id });
          this.io.to(`staff:${availableStaff.id}`).emit('taskAssigned', { taskType: task.constructor.name, taskId: task.id });
        }
      }

      await staff.update({ deleted_at: new Date() });
      this.io.to(`merchant:${merchantId}`).emit('staffRemoved', { staffId });
      logger.info('Staff removed', { merchantId, staffId });
      return { success: true };
    } catch (error) {
      logger.error('Error removing staff', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to remove staff', 500);
    }
  }

  // Assign staff to a customer-facing task (booking, in-dining order, takeaway order, subscription pickup)
  async assignStaffToTask(merchantId, staffId, taskType, taskId) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId }, include: [{ model: User }] });
      if (!staff) throw new AppError('Staff not found', 404);

      let task;
      switch (taskType) {
        case 'booking':
          task = await Booking.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId) throw new AppError('Booking not found', 404);
          await task.update({ staff_id: staffId });
          break;
        case 'inDiningOrder':
          task = await InDiningOrder.findByPk(taskId);
          if (!task || task.branch.merchant_id !== merchantId) throw new AppError('Order not found', 404);
          await task.update({ staff_id: staffId });
          break;
        case 'takeawayOrder':
          task = await Order.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId || task.order_number.startsWith('SUB')) throw new AppError('Order not found', 404);
          await task.update({ staff_id: staffId });
          break;
        case 'subscriptionPickup':
          task = await Order.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId || !task.order_number.startsWith('SUB')) throw new AppError('Subscription order not found', 404);
          await task.update({ staff_id: staffId });
          break;
        default:
          throw new AppError('Invalid task type', 400);
      }

      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: { templateName: 'staff_task_assignment' },
        content: `You’ve been assigned to ${taskType} #${taskId}`,
        recipient: staff.user.phone,
      });

      this.io.to(`staff:${staffId}`).emit('taskAssigned', { taskType, taskId });
      this.io.to(`merchant:${merchantId}`).emit('taskAssignedUpdate', { staffId, taskType, taskId });
      logger.info('Staff assigned to task', { merchantId, staffId, taskType, taskId });
      return task;
    } catch (error) {
      logger.error('Error assigning staff to task', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to assign staff to task', 500);
    }
  }

  // Get all active tasks for a specific staff member
  async getStaffTasks(merchantId, staffId = null) {
    try {
      const whereStaff = staffId ? { id: staffId, merchant_id: merchantId } : { merchant_id: merchantId };
      const staff = await Staff.findAll({ where: whereStaff });
      const staffIds = staff.map(s => s.id);

      const bookings = await Booking.findAll({
        where: { staff_id: { [Op.in]: staffIds }, status: { [Op.in]: ['pending', 'approved', 'seated'] } },
      });
      const inDiningOrders = await InDiningOrder.findAll({
        where: { staff_id: { [Op.in]: staffIds }, status: { [Op.ne]: 'closed' } },
      });
      const takeawayOrders = await Order.findAll({
        where: { staff_id: { [Op.in]: staffIds }, status: { [Op.in]: ['pending', 'preparing'] }, order_number: { [Op.notLike]: 'SUB%' } },
      });
      const subscriptionOrders = await Order.findAll({
        where: { staff_id: { [Op.in]: staffIds }, status: { [Op.in]: ['pending', 'preparing'] }, order_number: { [Op.like]: 'SUB%' } },
      });

      const tasks = { bookings, inDiningOrders, takeawayOrders, subscriptionOrders };
      if (staffId) {
        this.io.to(`staff:${staffId}`).emit('tasksUpdate', tasks);
      }
      return tasks;
    } catch (error) {
      logger.error('Error retrieving staff tasks', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to retrieve staff tasks', 500);
    }
  }

  // Manage staff availability
  async manageStaffAvailability(merchantId, staffId, availabilityStatus) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId } });
      if (!staff) throw new AppError('Staff not found', 404);

      await this.availabilityShiftService.setAvailabilityStatus(staffId, availabilityStatus);
      this.io.to(`merchant:${merchantId}`).emit('staffAvailabilityUpdate', { staffId, availabilityStatus });
      logger.info('Staff availability updated', { merchantId, staffId, availabilityStatus });
      return { success: true };
    } catch (error) {
      logger.error('Error managing staff availability', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to manage staff availability', 500);
    }
  }

  // Monitor staff performance across tasks
  async getStaffPerformance(merchantId, staffId, period = 'month') {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId }, include: [{ model: User }] });
      if (!staff) throw new AppError('Staff not found', 404);

      const bookingsCount = await Booking.count({
        where: { staff_id: staffId, status: 'seated', seated_at: { [Op.gte]: this.getPeriodStart(period) } },
      });
      const ordersCount = await InDiningOrder.count({
        where: { staff_id: staffId, status: 'closed', updated_at: { [Op.gte]: this.getPeriodStart(period) } },
      });
      const takeawayCount = await Order.count({
        where: { staff_id: staffId, status: 'ready', order_number: { [Op.notLike]: 'SUB%' }, updated_at: { [Op.gte]: this.getPeriodStart(period) } },
      });
      const subscriptionCount = await Order.count({
        where: { staff_id: staffId, status: 'ready', order_number: { [Op.like]: 'SUB%' }, updated_at: { [Op.gte]: this.getPeriodStart(period) } },
      });
      const feedback = await Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: this.getPeriodStart(period) } },
      });

      const performance = {
        staffId,
        name: staff.user.getFullName(),
        bookingsCompleted: bookingsCount,
        inDiningOrdersClosed: ordersCount,
        takeawayOrdersPrepared: takeawayCount,
        subscriptionOrdersPrepared: subscriptionCount,
        averageRating: feedback.length ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0,
        points: this.performanceIncentiveService.calculateRewards({ bookingsCount, ordersCount, takeawayCount, subscriptionCount }),
      };

      this.io.to(`merchant:${merchantId}`).emit('staffPerformanceUpdate', performance);
      logger.info('Staff performance retrieved', { merchantId, staffId });
      return performance;
    } catch (error) {
      logger.error('Error retrieving staff performance', { error: error.message, merchantId, staffId });
      throw new AppError('Failed to retrieve staff performance', 500);
    }
  }

  // Generate staff performance report for all staff
  async generateStaffReport(merchantId, period = 'month') {
    try {
      const staff = await Staff.findAll({ where: { merchant_id: merchantId } });
      const report = await Promise.all(
        staff.map(async (s) => await this.getStaffPerformance(merchantId, s.id, period))
      );
      await this.notificationService.sendThroughChannel('EMAIL', {
        notification: { templateName: 'staff_report' },
        content: `Staff Performance Report for ${period}: ${JSON.stringify(report, null, 2)}`,
        recipient: (await User.findOne({ where: { id: merchantId, role_id: 19 } })).email,
      });
      return report;
    } catch (error) {
      logger.error('Error generating staff report', { error: error.message, merchantId });
      throw new AppError('Failed to generate staff report', 500);
    }
  }

  // Helper to calculate period start date
  getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'day': return new Date(now.setDate(now.getDate() - 1));
      case 'week': return new Date(now.setDate(now.getDate() - 7));
      case 'month': return new Date(now.setMonth(now.getMonth() - 1));
      default: return new Date(now.setMonth(now.getMonth() - 1));
    }
  }
}

module.exports = MerchantStaffOperationsService;