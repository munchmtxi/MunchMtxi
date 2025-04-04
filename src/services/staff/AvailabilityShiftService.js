'use strict';

const { Op } = require('sequelize');
const cron = require('node-cron');
const { 
  Staff, 
  User, 
  MerchantBranch, 
  Table, 
  Booking, 
  Order, 
  Notification 
} = require('@models'); // Removed Device from imports
const AppError = require('@utils/appError');
const { logger, PerformanceMonitor } = require('@utils/logger');
const NotificationService = require('@services/notifications/core/notificationService');

class AvailabilityShiftService {
  constructor(io) {
    this.io = io;
    this.notificationService = null;
    this.performanceMonitor = PerformanceMonitor;
    this.setupCronJobs();
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async setAvailabilityStatus(staffId, status) {
    const validStatuses = ['available', 'busy', 'on_break', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid availability status', 400, 'INVALID_STATUS', null, { status });
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: User, as: 'user' }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId });
    }

    await staff.update({ availability_status: status });
    logger.info('Staff availability updated', { staffId, status });

    await this.updateRealTimeAvailability(staff);
    await this.sendShiftNotifications(staff, status);

    return staff;
  }

  async assignStaffToBooking(staffId, entity) {
    const { id, type } = entity;
    const staff = await Staff.findByPk(staffId);
    if (!staff || staff.availability_status !== 'available') {
      throw new AppError('Staff unavailable', 400, 'STAFF_UNAVAILABLE', null, { staffId });
    }

    let updatedEntity;
    if (type === 'booking') {
      const booking = await Booking.findByPk(id, {
        include: [{ model: Table, as: 'table' }],
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND', null, { id });
      }
      await booking.update({ staff_id: staffId });
      if (booking.table) {
        await Table.update({ assigned_staff_id: staffId }, { where: { id: booking.table_id } });
      }
      updatedEntity = booking;
    } else if (type === 'order') {
      const order = await Order.findByPk(id);
      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND', null, { id });
      }
      await order.update({ staff_id: staffId });
      updatedEntity = order;
    } else {
      throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE', null, { type });
    }

    await staff.update({ availability_status: 'busy' });
    logger.info('Staff assigned to entity', { staffId, entityId: id, type });

    await this.updateRealTimeAvailability(staff);
    await this.sendShiftNotifications(staff, 'busy', updatedEntity);

    return updatedEntity;
  }

  async updateRealTimeAvailability(staff) {
    const perf = this.performanceMonitor.start('updateRealTimeAvailability');
    try {
      const staffData = await Staff.findByPk(staff.id, {
        include: [{ model: User, as: 'user' }], // Removed MerchantBranch
      });
  
      if (!staffData) {
        throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND', null, { staffId: staff.id });
      }
  
      const availabilityData = {
        staffId: staffData.id,
        status: staffData.availability_status,
        name: staffData.user.getFullName(),
        branchId: staffData.branch_id, // Use staff.branch_id directly
        updatedAt: new Date(),
      };
  
      // Emit only if branch_id exists; otherwise, skip silently
      if (staffData.branch_id) {
        this.io.to(`branch_${staffData.branch_id}`).emit('staffAvailabilityUpdate', availabilityData);
        logger.info('Real-time availability updated', availabilityData);
      } else {
        logger.info('Real-time update skipped due to missing branch_id', { staffId: staffData.id });
      }
    } catch (error) {
      logger.error('Failed to update real-time availability', { error: error.message, staffId: staff.id });
      throw new AppError('Real-time update failed', 500, 'REALTIME_UPDATE_FAILED', null, { staffId: staff.id });
    } finally {
      perf.end();
    }
  }

  async sendShiftNotifications(staff, status, entity = null) {
    if (!this.notificationService) {
      logger.warn('Notification service not initialized', { staffId: staff.id });
      return;
    }

    const user = await User.findByPk(staff.user_id); // Removed Device include

    const message = entity
      ? `Staff ${user.getFullName()} is now ${status} for ${entity.type} #${entity.id}`
      : `Staff ${user.getFullName()} is now ${status}`;

    await Notification.create({
      user_id: staff.user_id,
      type: 'availability_update',
      message,
      priority: 'MEDIUM',
    });

    const merchantStaff = await Staff.findAll({
      where: { merchant_id: staff.merchant_id, position: { [Op.in]: ['manager', 'owner'] } },
      include: [{ model: User, as: 'user' }],
    });
    const recipients = merchantStaff.map(s => s.user.phone).filter(Boolean);

    if (recipients.length > 0) {
      await this.notificationService.sendThroughChannel('WHATSAPP', {
        notification: { templateName: 'staff_shift_update' },
        content: message,
        recipient: recipients[0],
      });
    }

    logger.info('Shift notification sent', { staffId: staff.id, status });
  }

  async getAvailableStaff(branchId, bookingDate, bookingTime) {
    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: branchId,
        start_time: { [Op.lte]: bookingTime },
        end_time: { [Op.gte]: bookingTime },
        day_of_week: sequelize.fn('EXTRACT', sequelize.literal(`DOW FROM DATE '${bookingDate}'`)),
        is_active: true,
      },
    });
    if (!timeSlot) {
      throw new AppError('No available time slot', 400, 'NO_TIME_SLOT', null, { bookingDate, bookingTime });
    }

    const staff = await Staff.findAll({
      where: {
        branch_id: branchId,
        availability_status: 'available',
      },
      include: [{ model: User, as: 'user' }],
    });

    logger.info('Available staff retrieved', { branchId, count: staff.length });
    return staff;
  }

  setupCronJobs() {
    cron.schedule('*/5 * * * *', async () => {
      try {
        const staff = await Staff.findAll({
          where: { availability_status: { [Op.ne]: 'offline' } },
          include: [{ model: User, as: 'user' }],
        });

        for (const s of staff) {
          const activeBookings = await Booking.count({
            where: {
              staff_id: s.id,
              status: { [Op.in]: ['approved', 'seated'] },
            },
          });
          const activeOrders = await Order.count({
            where: {
              staff_id: s.id,
              status: { [Op.in]: ['pending', 'confirmed', 'preparing'] },
            },
          });

          const shouldBeBusy = activeBookings > 0 || activeOrders > 0;
          if (shouldBeBusy && s.availability_status !== 'busy') {
            await s.update({ availability_status: 'busy' });
            await this.updateRealTimeAvailability(s);
            await this.sendShiftNotifications(s, 'busy');
          } else if (!shouldBeBusy && s.availability_status === 'busy') {
            await s.update({ availability_status: 'available' });
            await this.updateRealTimeAvailability(s);
            await this.sendShiftNotifications(s, 'available');
          }
        }

        logger.info('Cron job executed: Shift availability checked', { timestamp: new Date() });
      } catch (error) {
        logger.error('Cron job failed', { error: error.message });
      }
    });

    logger.info('Cron jobs for shift management scheduled');
  }
}

module.exports = AvailabilityShiftService;