'use strict';

const { User, Driver } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const libphonenumber = require('google-libphonenumber');

class DriverProfileService {
  /**
   * Get driver profile with all details
   * @param {number} driverId - Driver ID
   * @returns {Object} Driver profile including user and driver details
   */
  async getProfile(driverId) {
    const driver = await Driver.findByPk(driverId, {
      attributes: [
        'id', 'user_id', 'name', 'phone_number', 'vehicle_info', 'license_number',
        'availability_status', 'current_location', 'last_location_update', 'service_area',
        'preferred_zones', 'created_at', 'updated_at', 'deleted_at'
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password', 'two_factor_secret', 'password_reset_token', 'password_reset_expires'] },
        },
      ],
    });

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
    }

    logger.info('Driver profile retrieved', { driverId });
    return driver;
  }

  /**
   * Update driver personal information
   * @param {number} driverId - Driver ID
   * @param {Object} updateData - Personal info updates
   * @returns {Object} Updated driver profile
   */
  async updatePersonalInfo(driverId, updateData) {
    const { first_name, last_name, email, phone } = updateData;
    const driver = await this.getProfile(driverId);
    const user = driver.user;

    const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

    // Validate phone number if provided
    if (phone && phone !== user.phone) {
      try {
        const number = phoneUtil.parse(phone);
        if (!phoneUtil.isValidNumber(number)) {
          throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
        }
        const existingUser = await User.findOne({ where: { phone } });
        if (existingUser && existingUser.id !== user.id) {
          throw new AppError('Phone number already in use', 400, 'DUPLICATE_PHONE', { field: 'phone' });
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
      }
    }

    // Prepare update data
    const userUpdates = {
      first_name: first_name || user.first_name,
      last_name: last_name || user.last_name,
      email: email || user.email,
      phone: phone || user.phone,
    };

    const driverUpdates = {
      name: `${userUpdates.first_name} ${userUpdates.last_name}`,
      phone_number: phone || driver.phone_number,
    };

    await user.update(userUpdates);
    await driver.update(driverUpdates);

    logger.info('Driver personal info updated', { driverId, updatedFields: Object.keys(updateData) });
    return { user, driver };
  }

  /**
   * Update driver vehicle information
   * @param {number} driverId - Driver ID
   * @param {Object} vehicleData - Vehicle details
   * @returns {Object} Updated driver profile
   */
  async updateVehicleInfo(driverId, vehicleData) {
    const driver = await this.getProfile(driverId);
    const { type, model, year } = vehicleData;

    const updatedVehicleInfo = {
      type: type || driver.vehicle_info.type,
      model: model || driver.vehicle_info.model,
      year: year || driver.vehicle_info.year,
    };

    await driver.update({ vehicle_info: updatedVehicleInfo });

    logger.info('Driver vehicle info updated', { driverId });
    return driver;
  }

  /**
   * Changes the driver's password
   * @param {Object} user - User object (must include password)
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   */
  async changePassword(user, currentPassword, newPassword) {
    logger.info('START: Changing driver password', { userId: user.id });

    // Fetch user with password explicitly
    const userWithPassword = await User.scope(null).findOne({
      where: { id: user.id },
      attributes: ['id', 'password'], // Include password explicitly
    });

    if (!userWithPassword) {
      logger.warn('User not found during password change', { userId: user.id });
      throw new AppError('User not found', 404);
    }

    const passwordMatch = bcrypt.compareSync(currentPassword, userWithPassword.password);
    if (!passwordMatch) {
      logger.warn('Current password incorrect', { userId: user.id });
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.update(
      { password: hashedNewPassword },
      { where: { id: user.id } }
    );

    logger.info('SUCCESS: Driver password changed', { userId: user.id });
  }
}

module.exports = new DriverProfileService();