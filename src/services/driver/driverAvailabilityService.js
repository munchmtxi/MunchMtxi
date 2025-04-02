'use strict';

const { Driver, DriverAvailability, Device } = require('@models');
const TokenService = require('@services/common/tokenService');
const { logger, logDebugEvent } = require('@utils/logger'); // Updated import
const mathUtils = require('@utils/mathUtils');

class DriverAvailabilityService {
  async setDriverShift(driverId, shiftData) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new Error('Driver not found');
      }

      const [availability, created] = await DriverAvailability.findOrCreate({
        where: { driver_id: driverId },
        defaults: {
          ...shiftData,
          driver_id: driverId,
          isOnline: true,
          lastUpdated: new Date(),
        },
      });

      if (!created) {
        await availability.update({
          ...shiftData,
          isOnline: true,
          lastUpdated: new Date(),
        });
      }

      logDebugEvent('Driver shift updated', {
        event: 'DRIVER_SHIFT_UPDATE',
        driverId,
        shiftData,
        timestamp: new Date(),
      });

      return {
        success: true,
        availability,
        message: created ? 'Shift created successfully' : 'Shift updated successfully',
      };
    } catch (error) {
      logger.error('Error setting driver shift:', error);
      throw error;
    }
  }

  async getDriverAvailability(driverId) {
    try {
      const availability = await DriverAvailability.findOne({
        where: { driver_id: driverId },
        include: [{ model: Driver, as: 'driver', attributes: ['id', 'name'] }], // Removed 'email'
      });
  
      if (!availability) {
        return {
          success: false,
          message: 'No availability set for this driver',
          isOnline: false,
        };
      }
  
      return {
        success: true,
        availability,
        isOnline: availability.isOnline,
      };
    } catch (error) {
      logger.error('Error getting driver availability:', error);
      throw error;
    }
  }

  async toggleOnlineStatus(driverId, isOnline) {
    try {
      const [availability, created] = await DriverAvailability.findOrCreate({
        where: { driver_id: driverId },
        defaults: {
          driver_id: driverId,
          date: new Date().toISOString().split('T')[0], // Default to today
          start_time: '00:00:00', // Default start time
          end_time: '23:59:59',   // Default end time
          status: 'available',    // Default status
          is_online: isOnline,    // Set initial online status
          last_updated: new Date(),
        },
      });

      if (!created) {
        // If record exists, update it
        await availability.update({
          is_online: isOnline,
          last_updated: new Date(),
        });
      }

      logDebugEvent('Driver status toggled', {
        event: 'DRIVER_STATUS_TOGGLE',
        driverId,
        isOnline,
        timestamp: new Date(),
      });

      return {
        success: true,
        isOnline: availability.isOnline,
        message: created ? 'Availability record created and status set' : 'Online status updated successfully',
      };
    } catch (error) {
      logger.error('Error toggling driver status:', error);
      throw error;
    }
  }

  async simulateAvailability(driverId) {
    try {
      const randomStatus = mathUtils.randomInt(0, 1) === 1;

      const availability = await DriverAvailability.findOne({
        where: { driver_id: driverId },
      });

      if (availability) {
        await availability.update({
          isOnline: randomStatus,
          lastUpdated: new Date(),
        });
      }

      logDebugEvent('Driver availability simulated', {
        event: 'DRIVER_AVAILABILITY_SIMULATION',
        driverId,
        randomStatus,
        timestamp: new Date(),
      });

      return {
        success: true,
        isOnline: randomStatus,
        message: 'Availability simulated successfully',
      };
    } catch (error) {
      logger.error('Error simulating availability:', error);
      throw error;
    }
  }

  async getDeviceStatus(driverId) {
    try {
      const device = await Device.findOne({
        where: { driver_id: driverId }, // Assuming Device model uses driver_id
      });

      return {
        success: true,
        device: device || null,
        isConnected: device?.isConnected || false,
      };
    } catch (error) {
      logger.error('Error getting device status:', error);
      throw error;
    }
  }
}

module.exports = new DriverAvailabilityService();