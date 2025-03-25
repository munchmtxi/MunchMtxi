'use strict';

const { sequelize, Sequelize } = require('@models'); // Import sequelize and Sequelize
const { Booking, Table, Customer, Merchant, Notification, BookingTimeSlot } = require('@models');
const AppError = require('@utils/AppError');
const { logger, logApiEvent, logWarnEvent, logErrorEvent } = require('@utils/logger');
const Op = Sequelize.Op; // Define Op from Sequelize

const bookingService = {
    async reserveTable({ customerId, merchantId, branchId, tableId, bookingDate, bookingTime, guestCount }) {
      const table = await Table.findOne({ where: { id: tableId, branch_id: branchId } });
      if (!table) {
        throw new AppError('Table not found', 404, 'TABLE_NOT_FOUND', null, { tableId, branchId });
      }
      if (table.capacity < guestCount) {
        throw new AppError('Guest count exceeds table capacity', 400, 'CAPACITY_EXCEEDED', null, {
          guestCount,
          tableCapacity: table.capacity,
        });
      }
  
      const timeSlot = await BookingTimeSlot.findOne({
        where: {
          branch_id: branchId,
          start_time: { [Op.lte]: bookingTime },
          end_time: { [Op.gte]: bookingTime },
          day_of_week: sequelize.fn('EXTRACT', sequelize.literal("DOW FROM DATE '" + bookingDate + "'")),
          is_active: true,
        },
      });
      if (!timeSlot) {
        throw new AppError('No available time slot', 400, 'NO_TIME_SLOT', null, { bookingDate, bookingTime });
      }
  
      const activeBookings = await Booking.count({
        where: {
          branch_id: branchId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: { [Op.in]: ['pending', 'approved', 'seated'] },
        },
      });
  
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND', null, { merchantId });
      }
      const merchantUserId = merchant.user_id;
  
      let booking;
      if (activeBookings >= timeSlot.max_capacity) {
        // Waitlist logic (unchanged)
        const waitlistPosition = (await Booking.count({
          where: {
            branch_id: branchId,
            booking_date: bookingDate,
            booking_time: bookingTime,
            waitlist_position: { [Op.ne]: null },
          },
        })) + 1;
  
        booking = await Booking.create({
          customer_id: customerId,
          merchant_id: merchantId,
          branch_id: branchId,
          table_id: tableId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          guest_count: guestCount,
          status: 'pending',
          waitlist_position: waitlistPosition,
          waitlisted_at: new Date(),
          reference: `WL-${Date.now()}`,
          booking_type: 'table',
        });
  
        await Notification.create({
          user_id: customerId,
          booking_id: booking.id,
          type: 'booking_waitlist',
          message: `You are on the waitlist (position ${waitlistPosition}) for ${bookingDate} at ${bookingTime}.`,
          priority: 'MEDIUM',
          read_status: false,
        });
  
        logApiEvent('Customer added to waitlist', { bookingId: booking.id, waitlistPosition });
      } else {
        booking = await Booking.create({
          customer_id: customerId,
          merchant_id: merchantId,
          branch_id: branchId,
          table_id: tableId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          guest_count: guestCount,
          status: 'pending',
          reference: `BK-${Date.now()}`,
          booking_type: 'table',
        });
  
        // Update table status to 'reserved'
        await Table.update(
          { status: 'reserved' },
          { where: { id: tableId, branch_id: branchId } }
        );
  
        await Notification.create({
          user_id: merchantUserId,
          booking_id: booking.id,
          type: 'booking_request',
          message: `New booking request for table ${tableId} on ${bookingDate} at ${bookingTime}.`,
          priority: 'MEDIUM',
          read_status: false,
        });
  
        logApiEvent('Table booking request created', { bookingId: booking.id, tableId });
      }
  
      return booking;
    },

  async approveOrDenyBooking({ bookingId, merchantId, action, reason }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.merchant_id !== merchantId) {
      throw new AppError('Booking not found or unauthorized', 404, 'BOOKING_NOT_FOUND', null, { bookingId, merchantId });
    }
    if (booking.status !== 'pending') {
      throw new AppError('Booking cannot be modified', 400, 'INVALID_STATUS', null, { currentStatus: booking.status });
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    await booking.update({
      status: newStatus,
      approval_reason: reason || null,
    });

    if (newStatus === 'approved') {
      await Table.update({ status: 'reserved' }, { where: { id: booking.table_id } });
    } else if (booking.waitlist_position) {
      await booking.update({ waitlist_position: null, waitlisted_at: null });
    }

    await Notification.create({
      user_id: booking.customer_id,
      booking_id: booking.id,
      type: 'booking_update',
      message: `Your booking has been ${newStatus}${reason ? `: ${reason}` : ''}.`,
      priority: 'MEDIUM',
    });

    logApiEvent(`Booking ${newStatus}`, { bookingId, merchantId, reason });
    return booking;
  },

  async checkInBooking({ bookingId, merchantId }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.merchant_id !== merchantId) {
      throw new AppError('Booking not found or unauthorized', 404, 'BOOKING_NOT_FOUND', null, { bookingId, merchantId });
    }
    if (booking.status !== 'approved') {
      throw new AppError('Booking not approved', 400, 'NOT_APPROVED', null, { currentStatus: booking.status });
    }

    await booking.update({
      status: 'seated',
      seated_at: new Date(),
    });
    await Table.update({ status: 'occupied' }, { where: { id: booking.table_id } });

    await Notification.create({
      user_id: booking.customer_id,
      booking_id: booking.id,
      type: 'check_in',
      message: 'You’ve been checked in. Enjoy your meal!',
      priority: 'MEDIUM',
    });

    const digitalMenuUrl = `/menu/${booking.branch_id}`;
    booking.booking_metadata = { ...booking.booking_metadata, digital_menu_url: digitalMenuUrl };
    await booking.save();

    logApiEvent('Customer checked in', { bookingId, digitalMenuUrl });
    return booking;
  },

  async cancelBooking({ bookingId, userId, isMerchant = false }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking || (isMerchant && booking.merchant_id !== userId) || (!isMerchant && booking.customer_id !== userId)) {
      throw new AppError('Booking not found or unauthorized', 404, 'BOOKING_NOT_FOUND', null, { bookingId, userId });
    }
    if (['cancelled', 'seated'].includes(booking.status)) {
      throw new AppError('Booking cannot be cancelled', 400, 'INVALID_STATUS', null, { currentStatus: booking.status });
    }

    const now = new Date();
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const timeDiffHours = (bookingDateTime - now) / (1000 * 60 * 60);
    const cancellationFee = timeDiffHours < 1 && !isMerchant ? 10.00 : 0;

    await booking.update({
      status: 'cancelled',
      booking_metadata: {
        ...booking.booking_metadata,
        cancellation_fee: cancellationFee,
        cancelled_by: isMerchant ? 'merchant' : 'customer',
        cancelled_at: now,
      },
    });
    await Table.update({ status: 'available' }, { where: { id: booking.table_id } });

    const recipientId = isMerchant ? booking.customer_id : booking.merchant_id;
    await Notification.create({
      user_id: recipientId,
      booking_id: booking.id,
      type: 'booking_cancelled',
      message: `Booking #${bookingId} cancelled${cancellationFee ? ` with a $${cancellationFee} fee` : ''}.`,
      priority: 'MEDIUM',
    });

    const nextWaitlist = await Booking.findOne({
      where: {
        branch_id: booking.branch_id,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        waitlist_position: 1,
      },
    });
    if (nextWaitlist) {
      await nextWaitlist.update({
        table_id: booking.table_id,
        waitlist_position: null,
        waitlisted_at: null,
        status: 'pending',
      });

      await Notification.create({
        user_id: nextWaitlist.customer_id,
        booking_id: nextWaitlist.id,
        type: 'booking_promoted',
        message: `Your waitlist spot is now a confirmed booking for ${booking.booking_date} at ${booking.booking_time}!`,
        priority: 'HIGH',
      });

      logApiEvent('Waitlist booking promoted', { bookingId: nextWaitlist.id });
    }

    logApiEvent('Booking cancelled', { bookingId, cancellationFee, cancelledBy: isMerchant ? 'merchant' : 'customer' });
    return booking;
  },

  async getAvailableTables({ branchId, bookingDate, bookingTime }) {
    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: branchId,
        start_time: { [Op.lte]: bookingTime },
        end_time: { [Op.gte]: bookingTime },
        day_of_week: sequelize.fn('EXTRACT', sequelize.literal("DOW FROM DATE '" + bookingDate + "'")),
        is_active: true,
      },
    });
    if (!timeSlot) {
      logWarnEvent('No time slot available for table check', { branchId, bookingDate, bookingTime });
      return [];
    }

    const bookings = await Booking.findAll({
      where: {
        branch_id: branchId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: { [Op.in]: ['pending', 'approved', 'seated'] },
      },
      attributes: ['table_id'],
    });
    const bookedTableIds = bookings.map(b => b.table_id); // Fixed: Explicit array mapping

    const tables = await Table.findAll({
      where: {
        branch_id: branchId,
        id: { [Op.notIn]: bookedTableIds },
        status: 'available',
      },
    });

    logApiEvent('Available tables retrieved', { branchId, count: tables.length });
    return tables;
  },
};

module.exports = bookingService;