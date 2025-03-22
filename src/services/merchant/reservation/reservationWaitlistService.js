'use strict';

const { Booking, BookingTimeSlot } = require('@models');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');
const { logger } = require('@utils/logger');

/**
 * Service for managing reservation waitlists.
 */
class ReservationWaitlistService {
  /**
   * Checks waitlist status for a booking and assigns a position if needed.
   * @param {number} branchId - Branch ID.
   * @param {string} bookingDate - Booking date (YYYY-MM-DD).
   * @param {string} bookingTime - Booking time (HH:MM).
   * @param {number} guestCount - Number of guests.
   * @param {object} transaction - Sequelize transaction.
   * @returns {Promise<object>} Waitlist status and position.
   */
  async checkWaitlistStatus(branchId, bookingDate, bookingTime, guestCount, transaction) {
    try {
      logger.info('Checking waitlist status', { branchId, bookingDate, bookingTime, guestCount });

      // Get the day of the week
      const date = new Date(bookingDate);
      const dayOfWeek = date.getDay();

      // Get the relevant time slot
      const timeSlot = await BookingTimeSlot.findOne({
        where: {
          branch_id: branchId,
          day_of_week: dayOfWeek,
          start_time: { [Op.lte]: bookingTime },
          end_time: { [Op.gte]: bookingTime },
          is_active: true,
        },
        transaction,
      });

      if (!timeSlot || timeSlot.overbooking_limit === 0) {
        return { isWaitlisted: false, waitlistPosition: null }; // No waitlist support
      }

      // Count existing bookings
      const existingBookings = await Booking.count({
        where: {
          branch_id: branchId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: { [Op.in]: ['pending', 'approved', 'seated', 'waitlisted'] },
        },
        transaction,
      });

      const capacity = timeSlot.max_capacity;
      const overbookingLimit = timeSlot.overbooking_limit || 0;

      if (existingBookings + guestCount <= capacity) {
        return { isWaitlisted: false, waitlistPosition: null }; // Within capacity
      }

      if (existingBookings < capacity + overbookingLimit) {
        const waitlistPosition = existingBookings - capacity + 1;
        logger.info('Booking added to waitlist', { position: waitlistPosition, branchId, bookingDate, bookingTime });
        return { isWaitlisted: true, waitlistPosition };
      }

      throw new AppError('Waitlist is full for this time slot', 400);
    } catch (error) {
      logger.error('Waitlist check failed', { error: error.message, branchId, bookingDate, bookingTime });
      throw error instanceof AppError ? error : new AppError('Failed to check waitlist status', 500, null, error.message);
    }
  }
}

module.exports = new ReservationWaitlistService();