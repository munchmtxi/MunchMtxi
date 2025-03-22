'use strict';

const db = require('@models');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');
const { logger, logTransactionEvent } = require('@utils/logger');
const availabilityService = require('./reservationAvailabilityService'); 
const waitlistService = require('./reservationWaitlistService'); 
const { v4: uuidv4 } = require('uuid');

class ReservationBookingService {
    async getBookings(branchId, filters = {}) {
      try {
        logger.info('Fetching bookings for branch', { branchId, filters });
  
        // Use ?? to handle null explicitly, falling back to defaults
        const limit = filters.limit ?? 50;
        const offset = filters.offset ?? 0;
  
        const bookings = await db.Booking.findAll({
          where: { branch_id: branchId, deleted_at: null },
          include: [
            {
              model: db.Customer,
              as: 'customer',
              where: { deleted_at: null },
              required: false,
              attributes: ['id', 'user_id', 'phone_number', 'address'],
              include: [{
                model: db.User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email'],
              }],
            },
            {
              model: db.Table,
              as: 'table',
              where: { deleted_at: null },
              required: false,
            },
          ],
          order: [['booking_date', 'ASC'], ['booking_time', 'ASC']],
          limit,
          offset,
        });
  
        return bookings;
      } catch (error) {
        logger.error('Error fetching bookings:', { error: error.message, branchId });
        throw new AppError('Failed to retrieve bookings', 500);
      }
    }

  async getBookingById(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer', attributes: ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone_number'] },
          { model: MerchantBranch, as: 'branch', attributes: ['id', 'merchant_id', 'name', 'address', 'contact_phone'] },
          { model: Table, as: 'table', attributes: ['id', 'table_number', 'capacity', 'location_type', 'table_type'] },
        ],
      });
      if (!booking) throw new AppError('Booking not found', 404);
      return booking;
    } catch (error) {
      logger.error('Error fetching booking by ID:', { error: error.message, bookingId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve booking', 500, null, error.message);
    }
  }

  async createBooking(bookingData) {
    const transaction = await sequelize.transaction();
    try {
      const {
        customer_id: rawCustomerId, // Renamed for clarity
        branch_id,
        booking_date,
        booking_time,
        guest_count,
        special_requests,
        seating_preference,
        occasion,
        source,
      } = bookingData;
  
      // Map user_id to customers.id
      const customer = await Customer.findOne({ where: { user_id: rawCustomerId }, transaction });
      if (!customer) throw new AppError('Customer not found for this user', 404);
      const customer_id = customer.id; // Use customers.id (e.g., 4)
  
      const branch = await MerchantBranch.findByPk(branch_id, { transaction });
      if (!branch) throw new AppError('Branch not found', 404);
      if (!branch.reservation_settings?.enabled) throw new AppError('Reservations are not enabled for this branch', 400);
      if (!branch.merchant_id) throw new AppError('Merchant ID not configured for this branch', 500);
  
      const reference = this._generateBookingReference(branch_id);
      await availabilityService.validateBookingDateTime(branch_id, booking_date, booking_time, guest_count, transaction);
  
      const requiresApproval = branch.reservation_settings?.requires_approval || false;
      const initialStatus = requiresApproval ? 'pending' : 'approved';
      const { isWaitlisted, waitlistPosition } = await waitlistService.checkWaitlistStatus(
        branch_id,
        booking_date,
        booking_time,
        guest_count,
        transaction
      );
  
      const bookingPayload = {
        customer_id, // Now uses mapped ID (e.g., 4)
        merchant_id: branch.merchant_id,
        branch_id,
        reference,
        booking_date,
        booking_time,
        booking_type: 'table',
        guest_count,
        special_requests,
        status: isWaitlisted ? 'waitlisted' : initialStatus,
        waitlist_position: isWaitlisted ? waitlistPosition : null,
        waitlisted_at: isWaitlisted ? new Date() : null,
        seating_preference: seating_preference || 'no_preference',
        occasion,
        source: source || 'app',
        check_in_code: this._generateCheckInCode(),
        customer_location_at_booking: bookingData.customer_location || null,
      };
  
      logger.info('Booking payload before creation', bookingPayload);
  
      const newBooking = await Booking.create(bookingPayload, { transaction });
  
      if (!isWaitlisted && !requiresApproval && branch.reservation_settings?.auto_assign_tables) {
        const assignedTable = await availabilityService.assignTable(
          branch_id,
          booking_date,
          booking_time,
          guest_count,
          seating_preference,
          transaction
        );
        if (assignedTable) {
          await newBooking.update({ table_id: assignedTable.id }, { transaction });
        }
      }
  
      await transaction.commit();
  
      logTransactionEvent({
        type: isWaitlisted ? 'booking_waitlisted' : 'booking_created',
        resourceId: newBooking.id,
        userId: customer_id,
        userRole: 'customer',
        metadata: { bookingReference: reference, merchantId: branch.merchant_id, branchId: branch_id, isWaitlisted },
      });
  
      return newBooking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating booking:', { error: error.message, bookingPayload });
      throw error instanceof AppError ? error : new AppError('Failed to create booking', 500, null, error.message);
    }
  }

  _generateBookingReference(branchId) {
    const prefix = `B${branchId}`;
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}${random}`;
  }

  _generateCheckInCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new ReservationBookingService();