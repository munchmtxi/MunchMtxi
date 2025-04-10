'use strict';

const { Staff, User, MerchantBranch, Booking, InDiningOrder, Order, Subscription, Feedback } = require('@models');
const StaffManagementService = require('@services/staff/staffManagementService');
const AvailabilityShiftService = require('@services/staff/availabilityShiftService');
const PerformanceIncentiveService = require('@services/staff/performanceIncentiveService');
const NotificationService = require('@services/notifications/core/notificationService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

class MerchantStaffOperationsService {
  constructor(io) {
    this.io = io;
    this.staffManagementService = StaffManagementService;
    this.availabilityShiftService = new AvailabilityShiftService(io);
    this.performanceIncentiveService = new PerformanceIncentiveService(io);
    this.notificationService = new NotificationService(io);
  }

  generateTempPassword() {
    const chars = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: '!@#$%^&*',
    };
    const getRandomChar = (str) => str[Math.floor(Math.random() * str.length)];

    let password = [
      getRandomChar(chars.uppercase),
      getRandomChar(chars.lowercase),
      getRandomChar(chars.numbers),
      getRandomChar(chars.special),
    ];

    const allChars = chars.uppercase + chars.lowercase + chars.numbers + chars.special;
    while (password.length < 12) {
      password.push(getRandomChar(allChars));
    }

    return password.sort(() => Math.random() - 0.5).join('');
  }

  async recruitStaff(merchantId, staffData) {
    try {
      const { first_name, last_name, email, phone, position, branch_id } = staffData;

      const branch = await MerchantBranch.findOne({ where: { id: branch_id, merchant_id: merchantId } });
      if (!branch) throw new AppError('Branch not found or does not belong to this merchant', 404);

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) throw new AppError('User with this email already exists', 400);

      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const countryMap = {
        '+265': 'malawi',
        '+260': 'zambia',
        '+258': 'mozambique',
        '+255': 'tanzania',
      };
      const country = countryMap[phone.slice(0, 4)] || 'malawi';

      const user = await User.create({
        first_name,
        last_name,
        email,
        phone,
        password: hashedPassword,
        role_id: 4,
        merchant_id: merchantId,
        country,
      });

      const staff = await Staff.create({
        user_id: user.id,
        merchant_id: merchantId,
        position,
        branch_id,
        availability_status: 'offline',
      });

      try {
        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_welcome' },
          content: `Welcome to the team, ${first_name}! Your role: ${position}. Temp password: ${tempPassword}`,
          recipient: phone,
        });
      } catch (notificationError) {
        logger.error('Failed to send staff welcome notification', { error: notificationError.message, recipient: phone });
      }

      this.io.to(`merchant:${merchantId}`).emit('staffRecruited', { staffId: staff.id, name: user.getFullName() });
      logger.info('Staff recruited', { merchantId, staffId: staff.id });
      return { staff, tempPassword };
    } catch (error) {
      logger.error('Error recruiting staff', { error: error.message, merchantId });
      throw error; // Propagate AppError or other errors as-is
    }
  }

  async updateStaffRole(merchantId, staffId, updates) {
    try {
      const staff = await Staff.findOne({
        where: { id: staffId, merchant_id: merchantId },
        include: [{ model: User, as: 'user' }],
      });
      if (!staff) throw new AppError('Staff not found', 404);

      const { position, branch_id } = updates;

      if (branch_id) {
        const branch = await MerchantBranch.findOne({ where: { id: branch_id, merchant_id: merchantId } });
        if (!branch) throw new AppError('Branch not found or does not belong to this merchant', 404);
      }

      await staff.update({ position, branch_id });

      this.io.to(`branch:${branch_id}`).emit('staffRoleUpdated', { staffId, position });

      try {
        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_role_update' },
          content: `Your role has been updated to ${position} at branch ${branch_id}`,
          recipient: staff.user.phone,
        });
      } catch (notificationError) {
        logger.error('Failed to send staff role update notification', { error: notificationError.message, recipient: staff.user.phone });
      }

      logger.info('Staff role updated', { merchantId, staffId, position });
      return staff;
    } catch (error) {
      logger.error('Error updating staff role', { error: error.message, merchantId, staffId });
      throw error;
    }
  }

  async removeStaff(merchantId, staffId) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId } });
      if (!staff) throw new AppError('Staff not found', 404);

      const activeTasks = await this.getStaffTasks(merchantId, staffId);
      for (const task of [
        ...activeTasks.bookings,
        ...activeTasks.inDiningOrders,
        ...activeTasks.takeawayOrders,
        ...activeTasks.subscriptionOrders,
      ]) {
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
      throw error;
    }
  }

  async assignStaffToTask(merchantId, staffId, taskType, taskId) {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId }, include: [{ model: User, as: 'user' }] });
      if (!staff) throw new AppError('Staff not found', 404);

      let task;
      switch (taskType) {
        case 'booking':
          task = await Booking.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId) throw new AppError('Booking not found', 404);
          await task.update({ staff_id: staffId });
          await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy'); // Update availability
          break;
        case 'inDiningOrder':
          task = await InDiningOrder.findByPk(taskId);
          if (!task || task.branch?.merchant_id !== merchantId) throw new AppError('Order not found', 404);
          await task.update({ staff_id: staffId });
          await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy');
          break;
        case 'takeawayOrder':
          task = await Order.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId || task.order_number.startsWith('SUB')) throw new AppError('Order not found', 404);
          await task.update({ staff_id: staffId });
          await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy');
          break;
        case 'subscriptionPickup':
          task = await Order.findByPk(taskId);
          if (!task || task.merchant_id !== merchantId || !task.order_number.startsWith('SUB')) throw new AppError('Subscription order not found', 404);
          await task.update({ staff_id: staffId });
          await this.availabilityShiftService.setAvailabilityStatus(staffId, 'busy');
          break;
        default:
          throw new AppError('Invalid task type', 400);
      }

      try {
        await this.notificationService.sendThroughChannel('WHATSAPP', {
          notification: { templateName: 'staff_task_assignment' },
          content: `You’ve been assigned to ${taskType} #${taskId}`,
          recipient: staff.user.phone,
        });
      } catch (notificationError) {
        logger.error('Failed to send task assignment notification', { error: notificationError.message, recipient: staff.user.phone });
      }

      this.io.to(`staff:${staffId}`).emit('taskAssigned', { taskType, taskId });
      this.io.to(`merchant:${merchantId}`).emit('taskAssignedUpdate', { staffId, taskType, taskId });
      logger.info('Staff assigned to task', { merchantId, staffId, taskType, taskId });
      return task;
    } catch (error) {
      logger.error('Error assigning staff to task', { error: error.message, merchantId, staffId });
      throw error;
    }
  }

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
      throw error;
    }
  }

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
      throw error;
    }
  }

  async getStaffPerformance(merchantId, staffId, period = 'month') {
    try {
      const staff = await Staff.findOne({ where: { id: staffId, merchant_id: merchantId }, include: [{ model: User, as: 'user' }] });
      if (!staff) throw new AppError('Staff not found', 404);

      const startDate = this.getPeriodStart(period);
      const bookingsCount = await Booking.count({
        where: { staff_id: staffId, status: 'seated', seated_at: { [Op.gte]: startDate } },
      });
      const ordersCount = await InDiningOrder.count({
        where: { staff_id: staffId, status: 'closed', updated_at: { [Op.gte]: startDate } },
      });
      const takeawayCount = await Order.count({
        where: { staff_id: staffId, status: 'ready', order_number: { [Op.notLike]: 'SUB%' }, updated_at: { [Op.gte]: startDate } },
      });
      const subscriptionCount = await Order.count({
        where: { staff_id: staffId, status: 'ready', order_number: { [Op.like]: 'SUB%' }, updated_at: { [Op.gte]: startDate } },
      });
      const feedback = await Feedback.findAll({
        where: { staff_id: staffId, created_at: { [Op.gte]: startDate } },
      });

      const metrics = {
        bookingsCompleted: bookingsCount,
        inDiningOrdersClosed: ordersCount,
        takeawayOrdersPrepared: takeawayCount,
        subscriptionOrdersPrepared: subscriptionCount,
      };
      const points = this.performanceIncentiveService.calculatePointsFromMetrics(metrics);

      const performance = {
        staffId,
        name: `${staff.user.first_name} ${staff.user.last_name}`,
        bookingsCompleted: bookingsCount,
        inDiningOrdersClosed: ordersCount,
        takeawayOrdersPrepared: takeawayCount,
        subscriptionOrdersPrepared: subscriptionCount,
        averageRating: feedback.length ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0,
        points,
      };

      this.io.to(`merchant:${merchantId}`).emit('staffPerformanceUpdate', performance);
      logger.info('Staff performance retrieved', { merchantId, staffId });
      return performance;
    } catch (error) {
      logger.error('Error retrieving staff performance', { error: error.message, merchantId, staffId });
      throw error;
    }
  }

  async generateStaffReport(merchantId, period = 'month') {
    try {
      const staff = await Staff.findAll({ where: { merchant_id: merchantId, deleted_at: null } });
      const report = await Promise.all(
        staff.map(async (s) => await this.getStaffPerformance(merchantId, s.id, period))
      );

      try {
        const owner = await User.findOne({ where: { merchant_id: merchantId, role_id: 19 } });
        if (owner) {
          await this.notificationService.sendThroughChannel('EMAIL', {
            notification: { templateName: 'staff_report' },
            content: `Staff Performance Report for ${period}: ${JSON.stringify(report, null, 2)}`,
            recipient: owner.email,
          });
        }
      } catch (notificationError) {
        logger.error('Failed to send staff report notification', { error: notificationError.message, merchantId });
      }

      logger.info('Staff report generated', { merchantId, period });
      return report;
    } catch (error) {
      logger.error('Error generating staff report', { error: error.message, merchantId });
      throw error;
    }
  }

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