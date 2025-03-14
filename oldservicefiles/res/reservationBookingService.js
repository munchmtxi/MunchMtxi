// services/merchantServices/reservationServices/reservationBookingService.js
const { 
    Booking, 
    Table, 
    MerchantBranch, 
    Customer, 
    Notification, 
    sequelize 
  } = require('@models');
  const AppError = require('@utils/AppError');
  const { Op } = require('sequelize');
  const { logger, logTransactionEvent } = require('@utils/logger');
  const notificationService = require('@services/notificationService');
  const whatsappService = require('@services/whatsappService');
  const availabilityService = require('./reservationAvailabilityService');
  const waitlistService = require('./reservationWaitlistService');
  const { v4: uuidv4 } = require('uuid');
  
  /**
   * Service for managing restaurant reservations core functionality
   */
  class ReservationBookingService {
    /**
     * Get all bookings for a branch with filters
     * @param {number} branchId - Branch ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} - Bookings
     */
    async getBookings(branchId, filters = {}) {
      try {
        const whereClause = { branch_id: branchId };
        
        // Apply date range filter
        if (filters.startDate && filters.endDate) {
          whereClause.booking_date = {
            [Op.between]: [filters.startDate, filters.endDate]
          };
        } else if (filters.date) {
          whereClause.booking_date = filters.date;
        }
        
        // Apply status filter
        if (filters.status) {
          whereClause.status = filters.status;
        }
        
        // Apply search filter (customer name, reference)
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
    
    /**
     * Get a single booking by ID
     * @param {number} bookingId - Booking ID
     * @returns {Promise<Object>} - Booking details
     */
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
    
    /**
     * Create a new booking
     * @param {Object} bookingData - Booking information
     * @returns {Promise<Object>} - Created booking
     */
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
        
        // 1. Check if branch exists
        const branch = await MerchantBranch.findByPk(branch_id);
        if (!branch) {
          await transaction.rollback();
          throw new AppError('Branch not found', 404);
        }
        
        // 2. Check if branch allows reservations
        if (!branch.reservation_settings?.enabled) {
          await transaction.rollback();
          throw new AppError('This branch does not accept reservations', 400);
        }
        
        // 3. Generate unique reference
        const reference = this._generateBookingReference(branch_id);
        
        // 4. Check if date is valid and available
        await availabilityService.validateBookingDateTime(branch_id, booking_date, booking_time, guest_count, transaction);
        
        // 5. Initialize booking with 'pending' status if manual approval required
        const requiresApproval = branch.reservation_settings?.requires_approval || false;
        const initialStatus = requiresApproval ? 'pending' : 'approved';
        
        // 6. Check waitlist status 
        const { isWaitlisted, waitlistPosition } = await waitlistService.checkWaitlistStatus(
          branch_id, booking_date, booking_time, guest_count, transaction
        );
        
        // 7. Create the booking
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
        
        // 8. Assign table if auto-assignment is enabled and booking is approved
        if (!isWaitlisted && !requiresApproval && branch.reservation_settings?.auto_assign_tables) {
          const assignedTable = await availabilityService.assignTable(
            branch_id, booking_date, booking_time, guest_count, seating_preference, transaction
          );
          
          if (assignedTable) {
            await newBooking.update({ table_id: assignedTable.id }, { transaction });
          }
        }
        
        // 9. Create notification for customer
        await this._createBookingNotification(newBooking, isWaitlisted, transaction);
        
        await transaction.commit();
        
        // 10. Send external notifications (WhatsApp, email) after commit
        await this._sendBookingConfirmationNotifications(newBooking.id, isWaitlisted);
        
        // 11. Log the transaction
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
    
    /**
     * Approve a booking
     * @param {number} bookingId - Booking ID
     * @param {number} tableId - Optional table ID to assign
     * @param {string} notes - Optional staff notes
     * @param {number} approvedBy - Staff/User ID who approved
     * @returns {Promise<Object>} - Updated booking
     */
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
        
        // Check if booking can be approved
        if (booking.status !== 'pending' && booking.status !== 'waitlisted') {
          await transaction.rollback();
          throw new AppError(`Cannot approve booking with status: ${booking.status}`, 400);
        }
        
        // If table ID provided, check and assign table
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
          
          // Check if table is available for the booking time
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
          
          // Assign the table
          booking.table_id = tableId;
        } else {
          // Auto-assign a table if none provided
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
        
        // Update booking status
        booking.status = 'approved';
        booking.approval_reason = notes;
        booking.waitlist_position = null;
        booking.booking_modified_at = new Date();
        booking.booking_modified_by = approvedBy;
        booking.party_notes = notes;
        
        await booking.save({ transaction });
        
        // Create notification
        await notificationService.createNotification({
          user_id: booking.customer.user_id,
          type: 'booking',
          title: 'Reservation Approved',
          message: `Your reservation at ${booking.branch.name} on ${booking.format_date()} at ${booking.format_time()} has been approved.`,
          data: {
            booking_id: booking.id,
            reference: booking.reference,
            status: booking.status
          },
          is_read: false
        }, transaction);
        
        await transaction.commit();
        
        // Send external notifications after commit
        if (booking.customer?.phone_number) {
          try {
            await whatsappService.sendBookingStatusUpdate(
              booking.customer.phone_number,
              'approved',
              {
                customerName: booking.customer.first_name,
                reference: booking.reference,
                date: booking.format_date(),
                time: booking.format_time(),
                venue: booking.branch.name,
                guests: booking.guest_count
              }
            );
          } catch (notificationError) {
            logger.error('WhatsApp notification error:', notificationError);
          }
        }
        
        // Log the event
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
    
    /**
     * Deny a booking
     * @param {number} bookingId - Booking ID
     * @param {string} reason - Reason for denial
     * @param {number} deniedBy - Staff/User ID who denied
     * @returns {Promise<Object>} - Updated booking
     */
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
        
        // Check if booking can be denied
        if (booking.status !== 'pending' && booking.status !== 'waitlisted') {
          await transaction.rollback();
          throw new AppError(`Cannot deny booking with status: ${booking.status}`, 400);
        }
        
        // Update booking status
        booking.status = 'denied';
        booking.approval_reason = reason;
        booking.booking_modified_at = new Date();
        booking.booking_modified_by = deniedBy;
        booking.waitlist_position = null;
        
        await booking.save({ transaction });
        
        // Create notification
        await notificationService.createNotification({
          user_id: booking.customer.user_id,
          type: 'booking',
          title: 'Reservation Denied',
          message: `Your reservation at ${booking.branch.name} on ${booking.format_date()} at ${booking.format_time()} has been denied. Reason: ${reason}`,
          data: {
            booking_id: booking.id,
            reference: booking.reference,
            status: booking.status,
            reason
          },
          is_read: false
        }, transaction);
        
        await transaction.commit();
        
        // Send external notifications after commit
        if (booking.customer?.phone_number) {
          try {
            await whatsappService.sendBookingStatusUpdate(
              booking.customer.phone_number,
              'denied',
              {
                customerName: booking.customer.first_name,
                reference: booking.reference,
                date: booking.format_date(),
                time: booking.format_time(),
                venue: booking.branch.name,
                reason
              }
            );
          } catch (notificationError) {
            logger.error('WhatsApp notification error:', notificationError);
          }
        }
        
        // Log the event
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
    
    /**
     * Cancel a booking
     * @param {number} bookingId - Booking ID
     * @param {string} reason - Cancellation reason
     * @param {number} cancelledBy - User ID who cancelled
     * @param {string} cancellerRole - Role of canceller (customer/staff)
     * @returns {Promise<Object>} - Cancelled booking
     */
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
        
        // Check if booking can be cancelled
        if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'denied') {
          await transaction.rollback();
          throw new AppError(`Cannot cancel booking with status: ${booking.status}`, 400);
        }
        
        // Check cancellation policies if cancelled by customer
        if (cancellerRole === 'customer') {
          const branch = booking.branch;
          const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
          const now = new Date();
          const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);
          
          // Check if cancellation is allowed
          if (!branch.reservation_settings?.allow_cancellations) {
            await transaction.rollback();
            throw new AppError('Cancellations are not allowed', 400);
          }
          
          // Check if within cancellation deadline
          const cancellationDeadline = branch.reservation_settings?.cancellation_deadline_hours || 24;
          if (hoursDifference < cancellationDeadline) {
            // Apply late cancellation policy
            // Implementation details for fees would go here
          }
        }
        
        // Update booking status
        booking.status = 'cancelled';
        booking.approval_reason = reason;
        booking.booking_modified_at = new Date();
        booking.booking_modified_by = cancelledBy;
        
        // If table was assigned, free it up
        if (booking.table_id) {
          booking.table_id = null;
        }
        
        await booking.save({ transaction });
        
        // If waitlisted, reorder waitlist positions
        if (booking.waitlist_position) {
          await waitlistService.reorderWaitlist(
            booking.branch_id, 
            booking.booking_date, 
            booking.waitlist_position, 
            transaction
          );
        }
        
        // Create notification
        const notificationTitle = cancellerRole === 'customer' ? 'Reservation Cancelled' : 'Reservation Cancelled by Venue';
        await notificationService.createNotification({
          user_id: booking.customer.user_id,
          type: 'booking',
          title: notificationTitle,
          message: `Your reservation at ${booking.branch.name} on ${booking.format_date()} at ${booking.format_time()} has been cancelled.`,
          data: {
            booking_id: booking.id,
            reference: booking.reference,
            status: booking.status,
            reason
          },
          is_read: false
        }, transaction);
        
        await transaction.commit();
        
        // Send external notifications after commit
        if (booking.customer?.phone_number) {
          try {
            await whatsappService.sendBookingStatusUpdate(
              booking.customer.phone_number,
              'cancelled',
              {
                customerName: booking.customer.first_name,
                reference: booking.reference,
                date: booking.format_date(),
                time: booking.format_time(),
                venue: booking.branch.name,
                reason
              }
            );
          } catch (notificationError) {
            logger.error('WhatsApp notification error:', notificationError);
          }
        }
        
        // Log the event
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
    
    /**
     * Mark customer as arrived
     * @param {number} bookingId - Booking ID
     * @param {number} staffId - Staff member who checked in the customer
     * @returns {Promise<Object>} - Updated booking
     */
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
        
        // Log the event
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
    
    /**
     * Mark customer as seated
     * @param {number} bookingId - Booking ID
     * @param {number} tableId - Optional new table ID if different from booked
     * @param {number} staffId - Staff member who seated the customer
     * @returns {Promise<Object>} - Updated booking
     */
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
        
        // If a new table ID is provided, update the table assignment
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
        
        // If customer hasn't been marked as arrived yet, do that too
        if (!booking.arrived_at) {
          booking.arrived_at = new Date();
        }
        
        await booking.save({ transaction });
        
        await transaction.commit();
        
        // Log the event
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
    
    /**
     * Mark booking as completed
     * @param {number} bookingId - Booking ID
     * @param {number} staffId - Staff member who completed the booking
     * @returns {Promise<Object>} - Updated booking
     */
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
        
        // Free up the table
        if (booking.table_id) {
          const table = await Table.findByPk(booking.table_id, { transaction });
          if (table) {
            await table.update({ status: 'available' }, { transaction });
          }
        }
        
        await transaction.commit();
        
        // Log the event
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
    
    // Private helper methods
    
    /**
     * Generate a unique booking reference
     * @private
     */
    _generateBookingReference(branchId) {
      const prefix = `B${branchId}`;
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}-${timestamp}${random}`;
    }
    
    /**
     * Generate a check-in code for the customer
     * @private
     */
    _generateCheckInCode() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    /**
     * Create a notification for a new booking
     * @private
     */
    async _createBookingNotification(booking, isWaitlisted, transaction) {
      const customer = await Customer.findByPk(booking.customer_id, { transaction });
      const branch = await MerchantBranch.findByPk(booking.branch_id, { transaction });
      
      if (!customer || !customer.user_id) return;
      
      const title = isWaitlisted ? 'Booking Waitlisted' : 'Booking Received';
      let message = '';
      
      if (isWaitlisted) {
        message = `Your reservation at ${branch.name} on ${booking.format_date()} at ${booking.format_time()} has been added to the waitlist at position ${booking.waitlist_position}.`;
      } else {
        message = `Your reservation at ${branch.name} on ${booking.format_date()} at ${booking.format_time()} has been received${booking.status === 'pending' ? ' and is awaiting approval.' : '.'}`;
      }
      
      await notificationService.createNotification({
        user_id: customer.user_id,
        type: 'booking',
        title,
        message,
        data: {
          booking_id: booking.id,
          reference: booking.reference,
          status: booking.status,
          waitlist_position: booking.waitlist_position
        },
        is_read: false
      }, transaction);
    }
    
    /**
     * Send external notifications for booking confirmation
     * @private
     */
    async _sendBookingConfirmationNotifications(bookingId, isWaitlisted) {
      try {
        const booking = await Booking.findByPk(bookingId, {
          include: [
            { model: Customer, as: 'customer' },
            { model: MerchantBranch, as: 'branch' }
          ]
        });
        
        if (!booking || !booking.customer) return;
        
        // Update last notification sent timestamp
        await booking.update({ last_notification_sent: new Date() });
        
        // Send WhatsApp notification if customer has WhatsApp enabled
        if (booking.customer.phone_number) {
          const templateName = isWaitlisted ? 'booking_waitlisted' : 
            (booking.status === 'pending' ? 'booking_pending' : 'booking_confirmed');
          
          await whatsappService.sendBookingStatusUpdate(
            booking.customer.phone_number,
            templateName,
            {
              customerName: booking.customer.first_name,
              reference: booking.reference,
              date: booking.format_date(),
              time: booking.format_time(),
              venue: booking.branch.name,
              guests: booking.guest_count,
              waitlistPosition: booking.waitlist_position
            }
          );
        }
        
        // Additional notification channels can be added here
        
      } catch (error) {
        logger.error('Error sending booking confirmation notifications:', error);
        // Don't throw error to avoid breaking the main flow
      }
    }
  }
  
  module.exports = new ReservationBookingService();