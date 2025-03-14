// services/merchantServices/reservationServices/reservationWaitlistService.js
const { 
    Booking, 
    MerchantBranch, 
    Customer, 
    sequelize 
  } = require('@models');
  const AppError = require('@utils/AppError');
  const { Op } = require('sequelize');
  const { logger } = require('@utils/logger');
  const notificationService = require('@services/notificationService');
  const whatsappService = require('@services/whatsappService');
  
  /**
   * Service for managing reservation waitlist functionality
   */
  class ReservationWaitlistService {
    /**
     * Check if booking should be waitlisted and get position
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} partySize - Number of guests
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<Object>} - Waitlist status and position
     */
    async checkWaitlistStatus(branchId, date, time, partySize, transaction) {
      try {
        // Get branch settings
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        
        if (!branch || !branch.reservation_settings?.waitlist_enabled) {
          return { isWaitlisted: false, waitlistPosition: null };
        }
        
        // Check current capacity for this time slot
        const availabilityService = require('./reservationAvailabilityService');
        const availableTables = await availabilityService.getAvailableTables(
          branchId, date, time, partySize
        );
        
        // If tables are available, no need to waitlist
        if (availableTables.length > 0) {
          return { isWaitlisted: false, waitlistPosition: null };
        }
        
        // Check current waitlist count
        const currentWaitlistCount = await Booking.count({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: 'waitlisted'
          },
          transaction
        });
        
        // Check if waitlist is full
        const maxWaitlistSize = branch.reservation_settings?.waitlist_max_size || 20;
        if (currentWaitlistCount >= maxWaitlistSize) {
          throw new AppError('Waitlist is full for this date', 400);
        }
        
        // Get next waitlist position
        const lastWaitlisted = await Booking.findOne({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: 'waitlisted'
          },
          order: [['waitlist_position', 'DESC']],
          transaction
        });
        
        const waitlistPosition = lastWaitlisted ? lastWaitlisted.waitlist_position + 1 : 1;
        
        return { isWaitlisted: true, waitlistPosition };
      } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error('Error checking waitlist status:', error);
        throw new AppError('Error checking waitlist status', 500);
      }
    }
    
    /**
     * Get branch waitlist
     * @param {number} branchId - Branch ID
     * @param {string} date - Optional date filter (YYYY-MM-DD)
     * @returns {Promise<Array>} - Waitlisted bookings
     */
    async getWaitlist(branchId, date = null) {
      try {
        const whereClause = {
          branch_id: branchId,
          status: 'waitlisted'
        };
        
        if (date) {
          whereClause.booking_date = date;
        }
        
        const waitlist = await Booking.findAll({
          where: whereClause,
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'user_id', 'first_name', 'last_name', 'phone_number', 'email']
            }
          ],
          order: [
            ['booking_date', 'ASC'],
            ['booking_time', 'ASC'],
            ['waitlist_position', 'ASC']
          ]
        });
        
        return waitlist;
      } catch (error) {
        logger.error('Error getting waitlist:', error);
        throw error;
      }
    }
    
    /**
     * Process the next waitlist entry
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} staffId - Staff ID processing the waitlist
     * @returns {Promise<Object>} - Processed booking
     */
    async processNextWaitlist(branchId, date, time, staffId) {
      const transaction = await sequelize.transaction();
      
      try {
        // Find the next waitlisted booking for this date/time
        const nextInWaitlist = await Booking.findOne({
          where: {
            branch_id: branchId,
            booking_date: date,
            booking_time: time,
            status: 'waitlisted'
          },
          order: [['waitlist_position', 'ASC']],
          include: [
            { model: Customer, as: 'customer' }
          ],
          transaction
        });
        
        if (!nextInWaitlist) {
          await transaction.rollback();
          throw new AppError('No waitlisted bookings found', 404);
        }
        
        // Check if a table is available now
        const availabilityService = require('./reservationAvailabilityService');
        const availableTables = await availabilityService.getAvailableTables(
          branchId, 
          date, 
          time, 
          nextInWaitlist.guest_count,
          nextInWaitlist.seating_preference,
          transaction
        );
        
        if (availableTables.length === 0) {
          await transaction.rollback();
          throw new AppError('No tables available for this booking', 400);
        }
        
        // Assign the table and approve the booking
        nextInWaitlist.status = 'approved';
        nextInWaitlist.table_id = availableTables[0].id;
        nextInWaitlist.waitlist_position = null;
        nextInWaitlist.booking_modified_at = new Date();
        nextInWaitlist.booking_modified_by = staffId;
        
        await nextInWaitlist.save({ transaction });
        
        // Reorder remaining waitlist entries
        await this.reorderWaitlist(branchId, date, 1, transaction);
        
        // Create notification
        await notificationService.createNotification({
          user_id: nextInWaitlist.customer.user_id,
          type: 'booking',
          title: 'Reservation Available',
          message: `Great news! A table has become available for your reservation at ${time} on ${date}.`,
          data: {
            booking_id: nextInWaitlist.id,
            reference: nextInWaitlist.reference,
            status: nextInWaitlist.status
          },
          is_read: false
        }, transaction);
        
        await transaction.commit();
        
        // Send external notifications after commit
        if (nextInWaitlist.customer?.phone_number) {
          try {
            await whatsappService.sendBookingStatusUpdate(
              nextInWaitlist.customer.phone_number,
              'waitlist_approved',
              {
                customerName: nextInWaitlist.customer.first_name,
                reference: nextInWaitlist.reference,
                date: nextInWaitlist.format_date(),
                time: nextInWaitlist.format_time()
              }
            );
          } catch (notificationError) {
            logger.error('WhatsApp notification error:', notificationError);
          }
        }
        
        return nextInWaitlist;
      } catch (error) {
        await transaction.rollback();
        logger.error('Error processing waitlist entry:', error);
        throw error;
      }
    }
    
    /**
     * Update estimated wait times for all waitlisted bookings
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @returns {Promise<number>} - Number of updated bookings
     */
    async updateEstimatedWaitTimes(branchId, date) {
      const transaction = await sequelize.transaction();
      
      try {
        const waitlistedBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: 'waitlisted'
          },
          order: [['waitlist_position', 'ASC']],
          transaction
        });
        
        if (waitlistedBookings.length === 0) {
          await transaction.rollback();
          return 0;
        }
        
        // Get branch settings
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        const baseWaitTime = branch?.reservation_settings?.average_wait_time_minutes || 15;
        
        // Update each booking with an estimated wait time
        let updatedCount = 0;
        
        for (const booking of waitlistedBookings) {
          // Simple calculation: position * base wait time
          // In a real system, this would be more sophisticated based on historical data
          const estimatedWaitMinutes = booking.waitlist_position * baseWaitTime;
          
          await booking.update({
            estimated_wait_time: estimatedWaitMinutes
          }, { transaction });
          
          updatedCount++;
        }
        
        await transaction.commit();
        return updatedCount;
      } catch (error) {
        await transaction.rollback();
        logger.error('Error updating wait times:', error);
        throw error;
      }
    }
    
    /**
     * Reorder waitlist positions after a cancellation or approval
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {number} startPosition - Position to start reordering from
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<number>} - Number of updated bookings
     */
    async reorderWaitlist(branchId, date, startPosition, transaction) {
      try {
        // Get all waitlisted bookings from the start position
        const waitlistBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: 'waitlisted',
            waitlist_position: { [Op.gte]: startPosition }
          },
          order: [['waitlist_position', 'ASC']],
          transaction
        });
        
        if (waitlistBookings.length === 0) {
          return 0;
        }
        
        // Reorder positions
        let newPosition = startPosition;
        let updatedCount = 0;
        
        for (const booking of waitlistBookings) {
          if (booking.waitlist_position !== newPosition) {
            await booking.update({ waitlist_position: newPosition }, { transaction });
            updatedCount++;
          }
          newPosition++;
        }
        
        return updatedCount;
      } catch (error) {
        logger.error('Error reordering waitlist:', error);
        throw error;
      }
    }
    
    /**
     * Notify waitlisted customers when a table becomes available
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @returns {Promise<Array>} - Notified bookings
     */
    async notifyWaitlistedCustomers(branchId, date, time) {
      const transaction = await sequelize.transaction();
      
      try {
        // Check for available tables
        const availabilityService = require('./reservationAvailabilityService');
        const tablesAvailable = await Table.count({
          where: {
            branch_id: branchId,
            status: 'available',
            is_active: true
          },
          transaction
        });
        
        if (tablesAvailable === 0) {
          await transaction.rollback();
          return [];
        }
        
        // Find waitlisted bookings for this date/time
        const waitlistedBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            booking_time: time,
            status: 'waitlisted'
          },
          include: [
            { model: Customer, as: 'customer' }
          ],
          order: [['waitlist_position', 'ASC']],
          limit: tablesAvailable, // Only notify as many customers as we have tables
          transaction
        });
        
        if (waitlistedBookings.length === 0) {
          await transaction.rollback();
          return [];
        }
        
        const notifiedBookings = [];
        
        // Send notifications
        for (const booking of waitlistedBookings) {
          // Create app notification
          await notificationService.createNotification({
            user_id: booking.customer.user_id,
            type: 'booking',
            title: 'Table Available',
            message: `A table has become available for your reservation at ${time}. Please confirm within the next 15 minutes.`,
            data: {
              booking_id: booking.id,
              reference: booking.reference,
              status: booking.status,
              requires_action: true,
              action_deadline: new Date(Date.now() + 15 * 60000) // 15 minutes from now
            },
            is_read: false
          }, transaction);
          
          // Update booking notification status
          await booking.update({
            notification_status: 'sent',
            last_notification_sent: new Date()
          }, { transaction });
          
          notifiedBookings.push(booking);
        }
        
        await transaction.commit();
        
        // Send external notifications after commit
        for (const booking of notifiedBookings) {
          if (booking.customer?.phone_number) {
            try {
              await whatsappService.sendBookingStatusUpdate(
                booking.customer.phone_number,
                'table_available',
                {
                  customerName: booking.customer.first_name,
                  reference: booking.reference,
                  date: booking.format_date(),
                  time: booking.format_time(),
                  confirmationDeadline: '15 minutes'
                }
              );
            } catch (notificationError) {
              logger.error('WhatsApp notification error:', notificationError);
            }
          }
        }
        
        return notifiedBookings;
      } catch (error) {
        await transaction.rollback();
        logger.error('Error notifying waitlisted customers:', error);
        throw error;
      }
    }
    
    /**
     * Move a booking up or down in the waitlist
     * @param {number} bookingId - Booking ID
     * @param {string} direction - 'up' or 'down'
     * @param {number} positions - Number of positions to move (default 1)
     * @param {number} staffId - Staff ID making the change
     * @returns {Promise<Object>} - Updated booking
     */
    async moveInWaitlist(bookingId, direction, positions = 1, staffId) {
      const transaction = await sequelize.transaction();
      
      try {
        const booking = await Booking.findByPk(bookingId, {
          include: [{ model: Customer, as: 'customer' }],
          transaction
        });
        
        if (!booking) {
          await transaction.rollback();
          throw new AppError('Booking not found', 404);
        }
        
        if (booking.status !== 'waitlisted') {
          await transaction.rollback();
          throw new AppError('Booking is not on the waitlist', 400);
        }
        
        const currentPosition = booking.waitlist_position;
        
        // Calculate new position
        let newPosition;
        if (direction === 'up') {
          newPosition = Math.max(1, currentPosition - positions);
        } else if (direction === 'down') {
          // Get max position to avoid moving beyond the end
          const maxPosition = await Booking.max('waitlist_position', {
            where: {
              branch_id: booking.branch_id,
              booking_date: booking.booking_date,
              status: 'waitlisted'
            },
            transaction
          });
          
          newPosition = Math.min(maxPosition, currentPosition + positions);
        } else {
          await transaction.rollback();
          throw new AppError('Invalid direction. Use "up" or "down"', 400);
        }
        
        // If position didn't change, nothing to do
        if (newPosition === currentPosition) {
          await transaction.rollback();
          return booking;
        }
        
        // Get all affected bookings
        let affectedBookings;
        if (direction === 'up') {
          // Moving up - need to move down all bookings between new and current position
          affectedBookings = await Booking.findAll({
            where: {
              branch_id: booking.branch_id,
              booking_date: booking.booking_date,
              status: 'waitlisted',
              waitlist_position: {
                [Op.gte]: newPosition,
                [Op.lt]: currentPosition
              }
            },
            order: [['waitlist_position', 'ASC']],
            transaction
          });
          
          // Move affected bookings down by 1
          for (const affected of affectedBookings) {
            await affected.update({
              waitlist_position: affected.waitlist_position + 1,
              booking_modified_at: new Date(),
              booking_modified_by: staffId
            }, { transaction });
          }
        } else {
          // Moving down - need to move up all bookings between current and new position
          affectedBookings = await Booking.findAll({
            where: {
              branch_id: booking.branch_id,
              booking_date: booking.booking_date,
              status: 'waitlisted',
              waitlist_position: {
                [Op.gt]: currentPosition,
                [Op.lte]: newPosition
              }
            },
            order: [['waitlist_position', 'ASC']],
            transaction
          });
          
          // Move affected bookings up by 1
          for (const affected of affectedBookings) {
            await affected.update({
              waitlist_position: affected.waitlist_position - 1,
              booking_modified_at: new Date(),
              booking_modified_by: staffId
            }, { transaction });
          }
        }
        
        // Update target booking's position
        booking.waitlist_position = newPosition;
        booking.booking_modified_at = new Date();
        booking.booking_modified_by = staffId;
        
        await booking.save({ transaction });
        
        // Create notification for the customer
        await notificationService.createNotification({
          user_id: booking.customer.user_id,
          type: 'booking',
          title: 'Waitlist Position Updated',
          message: `Your position on the waitlist has been updated to #${newPosition}.`,
          data: {
            booking_id: booking.id,
            reference: booking.reference,
            status: booking.status,
            waitlist_position: newPosition
          },
          is_read: false
        }, transaction);
        
        await transaction.commit();
        
        // Send external notification
        if (booking.customer?.phone_number) {
          try {
            await whatsappService.sendBookingStatusUpdate(
              booking.customer.phone_number,
              'waitlist_updated',
              {
                customerName: booking.customer.first_name,
                reference: booking.reference,
                position: newPosition,
                direction: direction === 'up' ? 'moved up' : 'moved down'
              }
            );
          } catch (notificationError) {
            logger.error('WhatsApp notification error:', notificationError);
          }
        }
        
        return booking;
      } catch (error) {
        await transaction.rollback();
        logger.error('Error moving waitlist position:', error);
        throw error;
      }
    }
    
    /**
     * Calculate and update expected seating times for waitlisted customers
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @returns {Promise<number>} - Number of updated bookings
     */
    async updateExpectedSeatingTimes(branchId, date) {
      const transaction = await sequelize.transaction();
      
      try {
        // Get branch settings
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        if (!branch) {
          await transaction.rollback();
          throw new AppError('Branch not found', 404);
        }
        
        const averageDiningDuration = branch.reservation_settings?.default_reservation_duration_minutes || 90;
        const averageTurnoverTime = 15; // Average time to clean and reset a table
        
        // Get current bookings and tables
        const currentBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: { [Op.in]: ['approved', 'seated'] }
          },
          order: [['booking_time', 'ASC']],
          transaction
        });
        
        const tables = await Table.findAll({
          where: {
            branch_id: branchId,
            is_active: true
          },
          transaction
        });
        
        const tableCount = tables.length;
        
        if (tableCount === 0) {
          await transaction.rollback();
          return 0;
        }
        
        // Get waitlisted bookings
        const waitlistedBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: 'waitlisted'
          },
          order: [['waitlist_position', 'ASC']],
          transaction
        });
        
        if (waitlistedBookings.length === 0) {
          await transaction.rollback();
          return 0;
        }
        
        // Calculate table turnover times
        const now = new Date();
        const currentDate = date;
        
        // Expected table availability times
        const tableAvailabilityTimes = new Array(tableCount).fill(now);
        
        // Update table availability based on current bookings
        for (const booking of currentBookings) {
          const bookingTime = new Date(`${currentDate}T${booking.booking_time}`);
          
          if (bookingTime > now) {
            // This booking is in the future
            const endTime = new Date(bookingTime.getTime() + (averageDiningDuration + averageTurnoverTime) * 60000);
            
            // Find the earliest available table
            let earliestTableIndex = 0;
            for (let i = 0; i < tableCount; i++) {
              if (tableAvailabilityTimes[i] < tableAvailabilityTimes[earliestTableIndex]) {
                earliestTableIndex = i;
              }
            }
            
            // Assign this booking to that table
            if (tableAvailabilityTimes[earliestTableIndex] < bookingTime) {
              tableAvailabilityTimes[earliestTableIndex] = endTime;
            } else {
              // Table is already occupied at this time
              tableAvailabilityTimes[earliestTableIndex] = new Date(
                tableAvailabilityTimes[earliestTableIndex].getTime() + (averageDiningDuration + averageTurnoverTime) * 60000
              );
            }
          }
        }
        
        // Update waitlist expected times
        let updatedCount = 0;
        
        for (const booking of waitlistedBookings) {
          // Find the next available table time
          let earliestTableIndex = 0;
          for (let i = 0; i < tableCount; i++) {
            if (tableAvailabilityTimes[i] < tableAvailabilityTimes[earliestTableIndex]) {
              earliestTableIndex = i;
            }
          }
          
          // Set expected seating time to the earliest available table
          const expectedSeatingTime = tableAvailabilityTimes[earliestTableIndex];
          
          // Update booking with estimated wait time in minutes
          const waitTimeMinutes = Math.max(0, Math.round((expectedSeatingTime - now) / 60000));
          
          await booking.update({
            estimated_wait_time: waitTimeMinutes
          }, { transaction });
          
          // Update table availability for next calculation
          tableAvailabilityTimes[earliestTableIndex] = new Date(
            expectedSeatingTime.getTime() + (averageDiningDuration + averageTurnoverTime) * 60000
          );
          
          updatedCount++;
        }
        
        await transaction.commit();
        return updatedCount;
      } catch (error) {
        await transaction.rollback();
        logger.error('Error updating expected seating times:', error);
        throw error;
      }
    }
  }
  
  module.exports = new ReservationWaitlistService();