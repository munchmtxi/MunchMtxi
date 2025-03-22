const { 
  Booking, 
  Table, 
  MerchantBranch, 
  Customer, 
  sequelize 
} = require('@models');
const AppError = require('@utils/AppError');
const { Op } = require('sequelize');
const { logger, logTransactionEvent } = require('@utils/logger');
const availabilityService = require('./reservationAvailabilityService');
const waitlistService = require('./reservationWaitlistService');
const { v4: uuidv4 } = require('uuid');

class ReservationBookingService {
  async getBookings(branchId, filters = {}) {
    try {
      const whereClause = { branch_id: branchId };

      if (filters.startDate && filters.endDate) {
        whereClause.booking_date = {
          [Op.between]: [filters.startDate, filters.endDate]
        };
      } else if (filters.date) {
        whereClause.booking_date = filters.date;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { reference: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const bookings = await Booking.findAll({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone_number']
          },
          {
            model: Table,
            as: 'table',
            attributes: ['id', 'table_number', 'capacity', 'location_type', 'table_type']
          }
        ],
        order: [
          ['booking_date', 'ASC'],
          ['booking_time', 'ASC']
        ],
        limit: filters.limit || 50,
        offset: filters.offset || 0
      });

      return bookings;
    } catch (error) {
      logger.error('Error getting bookings:', error);
      throw error;
    }
  }

  async getBookingById(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone_number']
          },
          {
            model: MerchantBranch,
            as: 'branch',
            attributes: ['id', 'merchant_id', 'name', 'address', 'contact_phone']
          },
          {
            model: Table,
            as: 'table',
            attributes: ['id', 'table_number', 'capacity', 'location_type', 'table_type']
          }
        ]
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      return booking;
    } catch (error) {
      logger.error(`Error getting booking ID ${bookingId}:`, error);
      throw error;
    }
  }

  async createBooking(bookingData) {
    const transaction = await sequelize.transaction();

    try {
      const { 
        customer_id, 
        merchant_id, 
        branch_id, 
        booking_date, 
        booking_time, 
        guest_count, 
        special_requests,
        seating_preference,
        occasion,
        source
      } = bookingData;

      const branch = await MerchantBranch.findByPk(branch_id);
      if (!branch) {
        await transaction.rollback();
        throw new AppError('Branch not found', 404);
      }

      if (!branch.reservation_settings?.enabled) {
        await transaction.rollback();
        throw new AppError('This branch does not accept reservations', 400);
      }

      const reference = this._generateBookingReference(branch_id);

      await availabilityService.validateBookingDateTime(branch_id, booking_date, booking_time, guest_count, transaction);

      const requiresApproval = branch.reservation_settings?.requires_approval || false;
      const initialStatus = requiresApproval ? 'pending' : 'approved';

      const { isWaitlisted, waitlistPosition } = await waitlistService.checkWaitlistStatus(
        branch_id, booking_date, booking_time, guest_count, transaction
      );

      const newBooking = await Booking.create(
        {
          customer_id,
          merchant_id,
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
          seating_preference,
          occasion,
          source: source || 'app',
          check_in_code: this._generateCheckInCode(),
          customer_location_at_booking: bookingData.customer_location || null
        },
        { transaction }
      );

      if (!isWaitlisted && !requiresApproval && branch.reservation_settings?.auto_assign_tables) {
        const assignedTable = await availabilityService.assignTable(
          branch_id, booking_date, booking_time, guest_count, seating_preference, transaction
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
        metadata: { 
          bookingReference: reference,
          merchantId: merchant_id,
          branchId: branch_id,
          isWaitlisted
        }
      });

      return newBooking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  async approveBooking(bookingId, tableId = null, notes = null, approvedBy = null) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: MerchantBranch, as: 'branch' }
        ],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status !== 'pending' && booking.status !== 'waitlisted') {
        await transaction.rollback();
        throw new AppError(`Cannot approve booking with status: ${booking.status}`, 400);
      }

      if (tableId) {
        const table = await Table.findOne({
          where: { 
            id: tableId,
            branch_id: booking.branch_id
          },
          transaction
        });

        if (!table) {
          await transaction.rollback();
          throw new AppError('Table not found', 404);
        }

        if (table.capacity < booking.guest_count) {
          await transaction.rollback();
          throw new AppError('Table capacity is not sufficient for the party size', 400);
        }

        const isTableAvailable = await availabilityService.isTableAvailableForBooking(
          tableId, 
          booking.booking_date, 
          booking.booking_time,
          booking.branch.reservation_settings?.default_reservation_duration_minutes || 90,
          transaction
        );

        if (!isTableAvailable) {
          await transaction.rollback();
          throw new AppError('Table is not available for the requested time', 400);
        }

        booking.table_id = tableId;
      } else {
        const assignedTable = await availabilityService.assignTable(
          booking.branch_id, 
          booking.booking_date, 
          booking.booking_time, 
          booking.guest_count,
          booking.seating_preference,
          transaction
        );

        if (assignedTable) {
          booking.table_id = assignedTable.id;
        }
      }

      booking.status = 'approved';
      booking.approval_reason = notes;
      booking.waitlist_position = null;
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = approvedBy;
      booking.party_notes = notes;

      await booking.save({ transaction });

      await transaction.commit();

      logTransactionEvent({
        type: 'booking_approved',
        resourceId: booking.id,
        userId: approvedBy,
        userRole: 'staff',
        metadata: { bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error approving booking:', error);
      throw error;
    }
  }

  async denyBooking(bookingId, reason, deniedBy = null) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: MerchantBranch, as: 'branch' }
        ],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status !== 'pending' && booking.status !== 'waitlisted') {
        await transaction.rollback();
        throw new AppError(`Cannot deny booking with status: ${booking.status}`, 400);
      }

      booking.status = 'denied';
      booking.approval_reason = reason;
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = deniedBy;
      booking.waitlist_position = null;

      await booking.save({ transaction });

      await transaction.commit();

      logTransactionEvent({
        type: 'booking_denied',
        resourceId: booking.id,
        userId: deniedBy,
        userRole: 'staff',
        metadata: { reason, bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error denying booking:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId, reason, cancelledBy, cancellerRole = 'customer') {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: MerchantBranch, as: 'branch' }
        ],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'denied') {
        await transaction.rollback();
        throw new AppError(`Cannot cancel booking with status: ${booking.status}`, 400);
      }

      if (cancellerRole === 'customer') {
        const branch = booking.branch;
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        const now = new Date();
        const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);

        if (!branch.reservation_settings?.allow_cancellations) {
          await transaction.rollback();
          throw new AppError('Cancellations are not allowed', 400);
        }

        const cancellationDeadline = branch.reservation_settings?.cancellation_deadline_hours || 24;
        if (hoursDifference < cancellationDeadline) {
          // Implementation details for fees would go here
        }
      }

      booking.status = 'cancelled';
      booking.approval_reason = reason;
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = cancelledBy;

      if (booking.table_id) {
        booking.table_id = null;
      }

      await booking.save({ transaction });

      if (booking.waitlist_position) {
        await waitlistService.reorderWaitlist(
          booking.branch_id, 
          booking.booking_date, 
          booking.waitlist_position, 
          transaction
        );
      }

      await transaction.commit();

      logTransactionEvent({
        type: 'booking_cancelled',
        resourceId: booking.id,
        userId: cancelledBy,
        userRole: cancellerRole,
        metadata: { reason, bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  async markCustomerArrived(bookingId, staffId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: MerchantBranch, as: 'branch' }],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status !== 'approved') {
        await transaction.rollback();
        throw new AppError(`Cannot check in a booking with status: ${booking.status}`, 400);
      }

      booking.arrived_at = new Date();
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = staffId;

      await booking.save({ transaction });

      await transaction.commit();

      logTransactionEvent({
        type: 'customer_arrived',
        resourceId: booking.id,
        userId: staffId,
        userRole: 'staff',
        metadata: { bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error marking customer as arrived:', error);
      throw error;
    }
  }

  async markCustomerSeated(bookingId, tableId, staffId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [{ model: MerchantBranch, as: 'branch' }],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status !== 'approved') {
        await transaction.rollback();
        throw new AppError(`Cannot seat a booking with status: ${booking.status}`, 400);
      }

      if (tableId && tableId !== booking.table_id) {
        const table = await Table.findOne({
          where: { 
            id: tableId,
            branch_id: booking.branch_id
          },
          transaction
        });

        if (!table) {
          await transaction.rollback();
          throw new AppError('Table not found', 404);
        }

        booking.table_id = tableId;
      }

      booking.status = 'seated';
      booking.seated_at = new Date();
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = staffId;

      if (!booking.arrived_at) {
        booking.arrived_at = new Date();
      }

      await booking.save({ transaction });

      await transaction.commit();

      logTransactionEvent({
        type: 'customer_seated',
        resourceId: booking.id,
        userId: staffId,
        userRole: 'staff',
        metadata: { tableId, bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error marking customer as seated:', error);
      throw error;
    }
  }

  async completeBooking(bookingId, staffId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await Booking.findByPk(bookingId, transaction);

      if (!booking) {
        await transaction.rollback();
        throw new AppError('Booking not found', 404);
      }

      if (booking.status !== 'seated') {
        await transaction.rollback();
        throw new AppError(`Cannot complete a booking with status: ${booking.status}`, 400);
      }

      booking.status = 'completed';
      booking.departed_at = new Date();
      booking.booking_modified_at = new Date();
      booking.booking_modified_by = staffId;

      await booking.save({ transaction });

      if (booking.table_id) {
        const table = await Table.findByPk(booking.table_id, { transaction });
        if (table) {
          await table.update({ status: 'available' }, { transaction });
        }
      }

      await transaction.commit();

      logTransactionEvent({
        type: 'booking_completed',
        resourceId: booking.id,
        userId: staffId,
        userRole: 'staff',
        metadata: { bookingDetails: booking }
      });

      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error completing booking:', error);
      throw error;
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
