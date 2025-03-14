// services/merchantServices/reservationServices/reservationAvailabilityService.js
const { 
    Booking, 
    Table, 
    MerchantBranch, 
    BookingTimeSlot, 
    BookingBlackoutDate, 
    sequelize 
  } = require('@models');
  const AppError = require('@utils/AppError');
  const { Op } = require('sequelize');
  const { logger } = require('@utils/logger');
  
  /**
   * Service for managing reservation availability and time slots
   */
  class ReservationAvailabilityService {
    /**
     * Check availability for a time slot
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} partySize - Number of guests
     * @returns {Promise<Object>} - Availability status
     */
    async checkAvailability(branchId, date, time, partySize) {
      try {
        // 1. Get branch details
        const branch = await MerchantBranch.findByPk(branchId);
        if (!branch) {
          throw new AppError('Branch not found', 404);
        }
        
        // 2. Check if reservations are enabled
        if (!branch.reservation_settings?.enabled) {
          return {
            available: false,
            reason: 'This branch does not accept reservations',
            canWaitlist: false
          };
        }
        
        // 3. Validate request against branch settings
        const validationResult = this._validateRequestAgainstSettings(
          branch.reservation_settings,
          date,
          partySize
        );
        
        if (!validationResult.isValid) {
          return {
            available: false,
            reason: validationResult.reason,
            canWaitlist: branch.reservation_settings?.waitlist_enabled || false
          };
        }
        
        // 4. Check if date is a blackout date
        const isBlackoutDate = await this._isBlackoutDate(branchId, date, time);
        if (isBlackoutDate) {
          return {
            available: false,
            reason: 'This date/time is not available for reservations',
            canWaitlist: false
          };
        }
        
        // 5. Check operating hours and time slots
        const isWithinOperatingHours = await this._isWithinOperatingHours(branchId, date, time);
        if (!isWithinOperatingHours) {
          return {
            available: false,
            reason: 'Outside of operating hours',
            canWaitlist: false
          };
        }
        
        // 6. Check current bookings and capacity
        const bookingDateTime = new Date(`${date}T${time}`);
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get available tables that meet the party size requirements
        const availableTables = await this.getAvailableTables(
          branchId, 
          date, 
          time, 
          partySize
        );
        
        // If no tables available, check if waitlist is an option
        if (availableTables.length === 0) {
          const waitlistEnabled = branch.reservation_settings?.waitlist_enabled || false;
          const currentWaitlistCount = await Booking.count({
            where: {
              branch_id: branchId,
              booking_date: date,
              status: 'waitlisted'
            }
          });
          
          const maxWaitlistSize = branch.reservation_settings?.waitlist_max_size || 20;
          const canAddToWaitlist = waitlistEnabled && currentWaitlistCount < maxWaitlistSize;
          
          return {
            available: false,
            reason: 'No tables available for the requested time and party size',
            canWaitlist: canAddToWaitlist,
            nextAvailableTime: await this._findNextAvailableTime(branchId, date, time, partySize)
          };
        }
        
        return {
          available: true,
          tablesAvailable: availableTables.length,
          recommendedTable: availableTables[0]
        };
      } catch (error) {
        logger.error('Error checking availability:', error);
        throw error;
      }
    }
    
    /**
     * Get availability for a date range
     * @param {number} branchId - Branch ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {number} partySize - Number of guests
     * @returns {Promise<Object>} - Availability by date and time
     */
    async getAvailabilityForDateRange(branchId, startDate, endDate, partySize) {
      try {
        const branch = await MerchantBranch.findByPk(branchId);
        if (!branch || !branch.reservation_settings?.enabled) {
          throw new AppError('Branch not found or reservations not enabled', 404);
        }
        
        // Generate array of dates between start and end
        const dates = this._generateDateRange(startDate, endDate);
        
        // For each date, check availability for time slots
        const availability = {};
        
        for (const date of dates) {
          const dayOfWeek = new Date(date).getDay();
          
          // Get time slots for this day
          const timeSlots = await BookingTimeSlot.findAll({
            where: {
              branch_id: branchId,
              day_of_week: dayOfWeek,
              is_active: true
            }
          });
          
          // Check blackout dates
          const isBlackout = await this._isBlackoutDate(branchId, date);
          
          if (isBlackout) {
            availability[date] = { available: false, reason: 'Blackout date' };
            continue;
          }
          
          // If no time slots defined, use default operating hours
          if (timeSlots.length === 0) {
            const operatingHours = branch.operating_hours[
              ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
            ];
            
            if (!operatingHours || operatingHours.is_closed) {
              availability[date] = { available: false, reason: 'Closed' };
              continue;
            }
            
            // Generate time slots from operating hours
            const slots = this._generateTimeSlotsFromHours(
              operatingHours.open,
              operatingHours.close,
              branch.reservation_settings?.booking_interval_minutes || 15
            );
            
            // Check availability for each slot
            availability[date] = { 
              available: true,
              timeSlots: await this._checkAvailabilityForTimeSlots(
                branchId, date, slots, partySize
              )
            };
          } else {
            // Use defined time slots
            const slotsByTime = {};
            
            for (const slot of timeSlots) {
              const generatedSlots = this._generateTimeSlotsFromHours(
                slot.start_time,
                slot.end_time,
                slot.booking_interval_minutes
              );
              
              for (const time of generatedSlots) {
                slotsByTime[time] = slot;
              }
            }
            
            // Check availability for each time
            availability[date] = {
              available: true,
              timeSlots: await this._checkAvailabilityForTimeSlots(
                branchId, date, Object.keys(slotsByTime), partySize, slotsByTime
              )
            };
          }
        }
        
        return availability;
      } catch (error) {
        logger.error('Error getting availability for date range:', error);
        throw error;
      }
    }
    
    /**
     * Get available tables for a time slot
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} partySize - Number of guests
     * @param {string} locationPreference - Optional location preference
     * @returns {Promise<Array>} - Available tables
     */
    async getAvailableTables(branchId, date, time, partySize, locationPreference = null) {
      try {
        // Get the duration from branch settings or use default
        const branch = await MerchantBranch.findByPk(branchId);
        const reservationDuration = branch?.reservation_settings?.default_reservation_duration_minutes || 90;
        
        // Calculate booking window
        const bookingTime = new Date(`${date}T${time}`);
        const bookingEndTime = new Date(bookingTime.getTime() + reservationDuration * 60000);
        
        // Find tables that are of adequate size and not already booked
        const tables = await Table.findAll({
          where: {
            branch_id: branchId,
            capacity: { [Op.gte]: partySize },
            is_active: true,
            ...(locationPreference && { location_type: locationPreference })
          },
          order: [
            // First order by exact fit (to avoid assigning large tables to small parties)
            [sequelize.literal(`ABS(capacity - ${partySize})`), 'ASC'],
            // Then by location preference if provided
            ...(locationPreference ? [[sequelize.literal(`location_type = '${locationPreference}'`), 'DESC']] : []),
            // Finally by table number
            ['table_number', 'ASC']
          ]
        });
        
        // Find bookings that overlap with our desired time slot
        const overlappingBookings = await Booking.findAll({
          where: {
            branch_id: branchId,
            booking_date: date,
            status: {
              [Op.in]: ['approved', 'seated'] // Only consider active bookings
            },
            [Op.or]: [
              {
                // Existing booking overlaps with start of new booking
                booking_time: {
                  [Op.between]: [
                    this._formatTimeForQuery(this._subtractMinutes(bookingTime, reservationDuration)),
                    this._formatTimeForQuery(bookingTime)
                  ]
                }
              },
              {
                // New booking overlaps with existing booking
                booking_time: {
                  [Op.lte]: this._formatTimeForQuery(bookingTime)
                },
                // And existing booking ends after new booking starts
                [Op.and]: sequelize.literal(
                  `DATE_ADD(CONCAT(booking_date, ' ', booking_time), 
                  INTERVAL ${reservationDuration} MINUTE) > '${date} ${time}'`
                )
              }
            ]
          },
          attributes: ['table_id']
        });
        
        // Filter out tables that are already booked
        const bookedTableIds = overlappingBookings.map(booking => booking.table_id);
        const availableTables = tables.filter(table => !bookedTableIds.includes(table.id));
        
        return availableTables;
      } catch (error) {
        logger.error('Error getting available tables:', error);
        throw error;
      }
    }
    
    /**
     * Validate booking date and time against branch rules
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} partySize - Number of guests
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<boolean>} - True if valid
     */
    async validateBookingDateTime(branchId, date, time, partySize, transaction) {
      try {
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        
        if (!branch) {
          throw new AppError('Branch not found', 404);
        }
        
        const settings = branch.reservation_settings || {};
        
        // 1. Validate party size
        if (partySize < (settings.min_party_size || 1)) {
          throw new AppError(`Party size must be at least ${settings.min_party_size || 1}`, 400);
        }
        
        if (partySize > (settings.max_party_size || 12)) {
          throw new AppError(`Party size cannot exceed ${settings.max_party_size || 12}`, 400);
        }
        
        // 2. Validate booking date is in the future
        const bookingDate = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (bookingDate <= now) {
          throw new AppError('Booking must be for a future date and time', 400);
        }
        
        // 3. Validate advance booking window
        const daysDifference = Math.ceil((bookingDate - now) / (1000 * 60 * 60 * 24));
        const maxAdvanceDays = settings.max_advance_booking_days || 30;
        
        if (daysDifference > maxAdvanceDays) {
          throw new AppError(`Booking can only be made up to ${maxAdvanceDays} days in advance`, 400);
        }
        
        // 4. Validate minimum notice
        const hoursDifference = (bookingDate - now) / (1000 * 60 * 60);
        const minAdvanceHours = settings.min_advance_booking_hours || 1;
        
        if (hoursDifference < minAdvanceHours) {
          throw new AppError(`Booking must be made at least ${minAdvanceHours} hour(s) in advance`, 400);
        }
        
        // 5. Check if date is a blackout date
        const isBlackout = await this._isBlackoutDate(branchId, date, time, transaction);
        
        if (isBlackout) {
          throw new AppError('This date or time is not available for reservations', 400);
        }
        
        // 6. Check if time is within operating hours
        const isWithinHours = await this._isWithinOperatingHours(branchId, date, time, transaction);
        
        if (!isWithinHours) {
          throw new AppError('Booking time is outside operating hours', 400);
        }
        
        return true;
      } catch (error) {
        throw error;
      }
    }
    
    /**
     * Assign a table to a booking
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} partySize - Number of guests
     * @param {string} locationPreference - Optional location preference
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<Object>} - Assigned table or null
     */
    async assignTable(branchId, date, time, partySize, locationPreference = null, transaction) {
      try {
        const availableTables = await this.getAvailableTables(branchId, date, time, partySize, locationPreference);
        
        if (availableTables.length === 0) {
          return null;
        }
        
        // Get the most appropriate table (first in the list due to ordering in getAvailableTables)
        const assignedTable = availableTables[0];
        
        return assignedTable;
      } catch (error) {
        logger.error('Error assigning table:', error);
        return null;
      }
    }
    
    /**
     * Check if a specific table is available for a booking
     * @param {number} tableId - Table ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {number} durationMinutes - Duration in minutes
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<boolean>} - True if available
     */
    async isTableAvailableForBooking(tableId, date, time, durationMinutes, transaction) {
      try {
        const table = await Table.findByPk(tableId, { transaction });
        
        if (!table || !table.is_active) {
          return false;
        }
        
        // Calculate booking window
        const bookingTime = new Date(`${date}T${time}`);
        const bookingEndTime = new Date(bookingTime.getTime() + durationMinutes * 60000);
        
        // Find bookings that overlap with our desired time slot
        const overlappingBookings = await Booking.count({
          where: {
            table_id: tableId,
            booking_date: date,
            status: {
              [Op.in]: ['approved', 'seated'] // Only consider active bookings
            },
            [Op.or]: [
              {
                // Existing booking overlaps with start of new booking
                booking_time: {
                  [Op.between]: [
                    this._formatTimeForQuery(this._subtractMinutes(bookingTime, durationMinutes)),
                    this._formatTimeForQuery(bookingTime)
                  ]
                }
              },
              {
                // New booking overlaps with existing booking
                booking_time: {
                  [Op.lte]: this._formatTimeForQuery(bookingTime)
                },
                // And existing booking ends after new booking starts
                [Op.and]: sequelize.literal(
                  `DATE_ADD(CONCAT(booking_date, ' ', booking_time), 
                  INTERVAL ${durationMinutes} MINUTE) > '${date} ${time}'`
                )
              }
            ]
          },
          transaction
        });
        
        return overlappingBookings === 0;
      } catch (error) {
        logger.error('Error checking table availability:', error);
        return false;
      }
    }
    
    /**
     * Find next available time slot
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} startTime - Starting time to search from (HH:MM)
     * @param {number} partySize - Number of guests
     * @returns {Promise<string|null>} - Next available time or null
     */
    async _findNextAvailableTime(branchId, date, startTime, partySize) {
      try {
        const branch = await MerchantBranch.findByPk(branchId);
        if (!branch) return null;
        
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        
        // Get operating hours for this day
        const operatingHours = branch.operating_hours?.[dayName];
        if (!operatingHours || operatingHours.is_closed) {
          return null;
        }
        
        const closingTime = operatingHours.close;
        
        // Get time slots from the specified start time until closing
        const timeSlots = await BookingTimeSlot.findAll({
          where: {
            branch_id: branchId,
            day_of_week: dayOfWeek,
            is_active: true,
            start_time: { [Op.lte]: closingTime }
          },
          order: [['start_time', 'ASC']]
        });
        
        let slotTimes = [];
        
        if (timeSlots.length > 0) {
          // Use defined time slots
          for (const slot of timeSlots) {
            const generatedSlots = this._generateTimeSlotsFromHours(
              slot.start_time,
              slot.end_time,
              slot.booking_interval_minutes
            );
            
            slotTimes = [...slotTimes, ...generatedSlots.filter(time => time > startTime)];
          }
        } else {
          // Use default intervals from operating hours
          slotTimes = this._generateTimeSlotsFromHours(
            startTime,
            closingTime,
            branch.reservation_settings?.booking_interval_minutes || 15
          );
        }
        
        // Check each time slot for availability
        for (const time of slotTimes) {
          const availableTables = await this.getAvailableTables(branchId, date, time, partySize);
          
          if (availableTables.length > 0) {
            return time;
          }
        }
        
        return null;
      } catch (error) {
        logger.error('Error finding next available time:', error);
        return null;
      }
    }
    
    /**
     * Check if date is a blackout date
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Optional time (HH:MM)
     * @param {Object} transaction - Optional transaction
     * @returns {Promise<boolean>} - True if blackout date
     * @private
     */
    async _isBlackoutDate(branchId, date, time = null, transaction = null) {
      try {
        const whereClause = {
          branch_id: branchId,
          blackout_date: date
        };
        
        const blackout = await BookingBlackoutDate.findOne({
          where: whereClause,
          transaction
        });
        
        if (!blackout) {
          return false;
        }
        
        // If no specific time range is defined, the entire day is blocked
        if (!blackout.start_time || !blackout.end_time) {
          return true;
        }
        
        // If time was provided, check if it falls within the blackout time range
        if (time) {
          return time >= blackout.start_time && time <= blackout.end_time;
        }
        
        return true;
      } catch (error) {
        logger.error('Error checking blackout date:', error);
        return false; // Default to allowing bookings in case of error
      }
    }
    
    /**
     * Check if time is within operating hours
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} time - Time (HH:MM)
     * @param {Object} transaction - Optional transaction
     * @returns {Promise<boolean>} - True if within operating hours
     * @private
     */
    async _isWithinOperatingHours(branchId, date, time, transaction = null) {
      try {
        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        if (!branch) return false;
        
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        
        // Check for custom time slots first
        const customSlot = await BookingTimeSlot.findOne({
          where: {
            branch_id: branchId,
            day_of_week: dayOfWeek,
            is_active: true,
            start_time: { [Op.lte]: time },
            end_time: { [Op.gte]: time }
          },
          transaction
        });
        
        if (customSlot) {
          return true;
        }
        
        // Fall back to branch operating hours
        const operatingHours = branch.operating_hours?.[dayName];
        
        if (!operatingHours || operatingHours.is_closed) {
          return false;
        }
        
        return time >= operatingHours.open && time <= operatingHours.close;
      } catch (error) {
        logger.error('Error checking operating hours:', error);
        return false; // Default to not allowing bookings in case of error
      }
    }
    
    /**
     * Validate request against branch settings
     * @param {Object} settings - Branch reservation settings
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {number} partySize - Number of guests
     * @returns {Object} - Validation result
     * @private
     */
    _validateRequestAgainstSettings(settings, date, partySize) {
      // 1. Validate party size
      if (partySize < (settings.min_party_size || 1)) {
        return {
          isValid: false,
          reason: `Party size must be at least ${settings.min_party_size || 1}`
        };
      }
      
      if (partySize > (settings.max_party_size || 12)) {
        return {
          isValid: false,
          reason: `Party size cannot exceed ${settings.max_party_size || 12}`
        };
      }
      
      // 2. Validate booking date is in the future
      const bookingDate = new Date(date);
      const now = new Date();
      
      if (bookingDate < now) {
        return {
          isValid: false,
          reason: 'Booking must be for a future date'
        };
      }
      
      // 3. Validate advance booking window
      const daysDifference = Math.ceil((bookingDate - now) / (1000 * 60 * 60 * 24));
      const maxAdvanceDays = settings.max_advance_booking_days || 30;
      
      if (daysDifference > maxAdvanceDays) {
        return {
          isValid: false,
          reason: `Booking can only be made up to ${maxAdvanceDays} days in advance`
        };
      }
      
      return { isValid: true };
    }
    
    /**
     * Generate array of dates between start and end dates
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Array<string>} - Array of dates in YYYY-MM-DD format
     * @private
     */
    _generateDateRange(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates = [];
      
      // Maximum range of 30 days to prevent excessive processing
      const maxDays = 30;
      const maxDate = new Date(start);
      maxDate.setDate(maxDate.getDate() + maxDays);
      
      const effectiveEndDate = end > maxDate ? maxDate : end;
      
      for (let dt = new Date(start); dt <= effectiveEndDate; dt.setDate(dt.getDate() + 1)) {
        dates.push(dt.toISOString().split('T')[0]);
      }
      
      return dates;
    }
    
    /**
     * Generate time slots between start and end times
     * @param {string} startTime - Start time (HH:MM)
     * @param {string} endTime - End time (HH:MM)
     * @param {number} intervalMinutes - Interval in minutes
     * @returns {Array<string>} - Array of time slots in HH:MM format
     * @private
     */
    _generateTimeSlotsFromHours(startTime, endTime, intervalMinutes = 15) {
      const slots = [];
      
      // Create date objects for start and end times
      const today = new Date().toISOString().split('T')[0]; // Use today's date as base
      const startDateTime = new Date(`${today}T${startTime}`);
      const endDateTime = new Date(`${today}T${endTime}`);
      
      // Buffer time before end to prevent bookings too close to closing
      const bufferMinutes = 60; // Default 1 hour buffer before closing
      const endTimeWithBuffer = new Date(endDateTime.getTime() - bufferMinutes * 60000);
      
      // Generate slots at specified intervals
      for (
        let time = new Date(startDateTime);
        time <= endTimeWithBuffer;
        time = new Date(time.getTime() + intervalMinutes * 60000)
      ) {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
      }
      
      return slots;
    }
    
    /**
     * Check availability for multiple time slots
     * @param {number} branchId - Branch ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {Array<string>} timeSlots - Array of time slots (HH:MM)
     * @param {number} partySize - Number of guests
     * @param {Object} slotMetadata - Optional metadata for each slot
     * @returns {Promise<Object>} - Availability for each time slot
     * @private
     */
    async _checkAvailabilityForTimeSlots(branchId, date, timeSlots, partySize, slotMetadata = {}) {
      const result = {};
      
      for (const time of timeSlots) {
        try {
          const availableTables = await this.getAvailableTables(branchId, date, time, partySize);
          
          result[time] = {
            available: availableTables.length > 0,
            tablesAvailable: availableTables.length,
            metadata: slotMetadata[time] || null
          };
        } catch (error) {
          logger.error(`Error checking availability for ${date} ${time}:`, error);
          result[time] = { 
            available: false, 
            error: 'Error checking availability' 
          };
        }
      }
      
      return result;
    }
    
    /**
     * Format time for database query
     * @param {Date} date - Date object
     * @returns {string} - Time in HH:MM:SS format
     * @private
     */
    _formatTimeForQuery(date) {
      return date.toTimeString().split(' ')[0];
    }
    
    /**
     * Subtract minutes from a date
     * @param {Date} date - Date object
     * @param {number} minutes - Minutes to subtract
     * @returns {Date} - New date
     * @private
     */
    _subtractMinutes(date, minutes) {
      return new Date(date.getTime() - minutes * 60000);
    }
  }
  
  module.exports = new ReservationAvailabilityService();