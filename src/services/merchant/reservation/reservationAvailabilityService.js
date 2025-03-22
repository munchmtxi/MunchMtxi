'use strict';

const { Booking, Table, BookingTimeSlot, BookingBlackoutDate, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');
const { logger } = require('@utils/logger');

/**
 * Service for checking reservation availability and assigning tables.
 */
class ReservationAvailabilityService {
  /**
   * Validates booking date, time, and guest count against blackout dates, time slots, and capacity.
   * @param {number} branchId - Branch ID.
   * @param {string} bookingDate - Booking date (YYYY-MM-DD).
   * @param {string} bookingTime - Booking time (HH:MM).
   * @param {number} guestCount - Number of guests.
   * @param {object} transaction - Sequelize transaction.
   * @throws {AppError} If validation fails.
   */
  async validateBookingDateTime(branchId, bookingDate, bookingTime, guestCount, transaction) {
    try {
      logger.info('Validating booking availability', { branchId, bookingDate, bookingTime, guestCount });

      // Check for blackout dates
      const blackout = await BookingBlackoutDate.findOne({
        where: {
          branch_id: branchId,
          blackout_date: bookingDate,
          [Op.or]: [
            { start_time: { [Op.lte]: bookingTime }, end_time: { [Op.gte]: bookingTime } },
            { start_time: null, end_time: null }, // Full-day blackout
          ],
        },
        transaction,
      });
      if (blackout) {
        throw new AppError(`Date ${bookingDate} is unavailable due to ${blackout.reason || 'a blackout'}`, 400);
      }

      // Get the day of the week (0 = Sunday, 6 = Saturday)
      const date = new Date(bookingDate);
      const dayOfWeek = date.getDay();

      // Check time slot availability
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
      if (!timeSlot) {
        throw new AppError(`No available time slot for ${bookingTime} on ${bookingDate}`, 400);
      }

      // Validate guest count against time slot constraints
      if (guestCount < timeSlot.min_party_size || guestCount > timeSlot.max_party_size) {
        throw new AppError(
          `Guest count ${guestCount} is outside allowed range (${timeSlot.min_party_size}-${timeSlot.max_party_size})`,
          400
        );
      }

      // Check current bookings against max capacity
      const existingBookings = await Booking.count({
        where: {
          branch_id: branchId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: { [Op.in]: ['pending', 'approved', 'seated'] },
        },
        transaction,
      });

      const totalCapacity = timeSlot.max_capacity + (timeSlot.overbooking_limit || 0);
      if (existingBookings + guestCount > totalCapacity) {
        throw new AppError('Booking exceeds available capacity for this time slot', 400);
      }

      return true;
    } catch (error) {
      logger.error('Availability validation failed', { error: error.message, branchId, bookingDate, bookingTime });
      throw error instanceof AppError ? error : new AppError('Failed to validate availability', 500, null, error.message);
    }
  }

  /**
   * Assigns a table for the booking based on guest count and seating preference.
   * @param {number} branchId - Branch ID.
   * @param {string} bookingDate - Booking date (YYYY-MM-DD).
   * @param {string} bookingTime - Booking time (HH:MM).
   * @param {number} guestCount - Number of guests.
   * @param {string} seatingPreference - Seating preference (e.g., 'indoor', 'booth').
   * @param {object} transaction - Sequelize transaction.
   * @returns {Promise<object|null>} Assigned table or null if none available.
   */
  async assignTable(branchId, bookingDate, bookingTime, guestCount, seatingPreference, transaction) {
    try {
      logger.info('Assigning table', { branchId, bookingDate, bookingTime, guestCount, seatingPreference });

      // Get branch settings
      const branch = await MerchantBranch.findByPk(branchId, { transaction });
      if (!branch?.reservation_settings?.auto_assign_tables) {
        logger.info('Auto table assignment disabled for branch', { branchId });
        return null;
      }

      // Find available tables matching criteria
      const availableTables = await Table.findAll({
        where: {
          branch_id: branchId,
          capacity: { [Op.gte]: guestCount },
          status: 'available',
          is_active: true,
          ...(seatingPreference && seatingPreference !== 'no_preference' ? { 
            [Op.or]: [
              { location_type: seatingPreference },
              { table_type: seatingPreference },
            ]
          } : {}),
        },
        transaction,
      });

      // Check if any of these tables are already booked for this time
      for (const table of availableTables) {
        const conflictingBooking = await Booking.findOne({
          where: {
            table_id: table.id,
            booking_date: bookingDate,
            booking_time: bookingTime,
            status: { [Op.in]: ['pending', 'approved', 'seated'] },
          },
          transaction,
        });

        if (!conflictingBooking) {
          // Update table status to reserved
          await table.update({ status: 'reserved' }, { transaction });
          logger.info('Table assigned', { tableId: table.id, tableNumber: table.table_number });
          return table;
        }
      }

      logger.warn('No suitable table available for assignment', { branchId, bookingDate, bookingTime });
      return null;
    } catch (error) {
      logger.error('Table assignment failed', { error: error.message, branchId, bookingDate, bookingTime });
      throw new AppError('Failed to assign table', 500, null, error.message);
    }
  }
}

module.exports = new ReservationAvailabilityService();