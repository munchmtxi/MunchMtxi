// src/services/staff/staffProfileService.js
'use strict';

const { User, Staff } = require('@models');
const { generate2FASecret, getQRCode } = require('@services/2faService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const libphonenumber = require('google-libphonenumber');

class StaffProfileService {
  /**
   * Get staff profile with all details
   * @param {number} staffId - Staff ID
   * @returns {Object} Staff profile including user and staff details
   */
  async getProfile(staffId) {
    const staff = await Staff.findByPk(staffId, {
      attributes: [
        'id', 'user_id', 'merchant_id', 'position', 'manager_id',
        'assigned_area', 'work_location', 'geofence_id',
        'created_at', 'updated_at', 'deleted_at'
      ], // Only existing columns
      include: [
        {
          model: User,
          as: 'user',
          attributes: { exclude: ['password', 'two_factor_secret', 'password_reset_token', 'password_reset_expires'] },
        },
      ],
    });

    if (!staff) {
      throw new AppError('Staff not found', 404, 'STAFF_NOT_FOUND');
    }

    logger.info('Staff profile retrieved', { staffId });
    return staff;
  }

  /**
   * Update staff personal information
   * @param {number} staffId - Staff ID
   * @param {Object} updateData - Personal info updates
   * @returns {Object} Updated staff profile
   */
  async updatePersonalInfo(staffId, updateData) {
    const { first_name, last_name, email, phone, address, documents } = updateData;
    const staff = await this.getProfile(staffId);
    const user = staff.user;

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

    // Validate documents
    if (documents) {
      documents.forEach(doc => {
        if (!doc.url || !doc.type) {
          throw new AppError('Document must have URL and type', 400, 'INVALID_DOCUMENT');
        }
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(doc.type)) {
          throw new AppError('Invalid document format', 400, 'INVALID_DOCUMENT_FORMAT');
        }
      });
    }

    // Prepare update data
    const userUpdates = {
      first_name: first_name || user.first_name,
      last_name: last_name || user.last_name,
      email: email || user.email,
      phone: phone || user.phone,
      documents: documents || user.documents,
      info_verification_status: documents || phone || email ? 'pending' : user.info_verification_status,
    };

    const staffUpdates = {
      work_location: address ? { lat: address.lat, lng: address.lng } : staff.work_location,
    };

    await user.update(userUpdates);
    await staff.update(staffUpdates);

    logger.info('Staff personal info updated', { staffId, updatedFields: Object.keys(updateData) });
    return { user, staff };
  }

  /**
   * Update vehicle information for delivery staff
   * @param {number} staffId - Staff ID
   * @param {Object} vehicleData - Vehicle details
   * @returns {Object} Updated staff profile
   */
  async updateVehicleInfo(staffId, vehicleData) {
    const staff = await this.getProfile(staffId);
    const { license_plate, make, model, maintenance_records } = vehicleData;

    const updatedVehicleDetails = {
      license_plate: license_plate || staff.vehicle_details?.license_plate,
      make: make || staff.vehicle_details?.make,
      model: model || staff.vehicle_details?.model,
      maintenance_records: maintenance_records || staff.vehicle_details?.maintenance_records || [],
    };

    await staff.update({ vehicle_details: updatedVehicleDetails });

    logger.info('Staff vehicle info updated', { staffId });
    return staff;
  }

  /**
   * Change staff password
   * @param {number} staffId - Staff ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  async changePassword(staffId, currentPassword, newPassword) {
    const staff = await this.getProfile(staffId);
    const user = staff.user;

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Update password (hooks in User model will hash it)
    await user.update({ password: newPassword });

    logger.info('Staff password updated', { staffId });
    return true;
  }

  /**
   * Toggle 2FA settings
   * @param {number} staffId - Staff ID
   * @param {boolean} enable - Enable or disable 2FA
   * @param {string} method - 2FA method (sms, email, authenticator)
   * @returns {Object} 2FA setup details
   */
  async toggleTwoFactorAuth(staffId, enable, method) {
    const staff = await this.getProfile(staffId);
    const user = staff.user;

    if (!enable) {
      await user.update({
        two_factor_secret: null,
        two_factor_method: null,
      });
      logger.info('2FA disabled', { staffId });
      return { status: 'disabled' };
    }

    if (!['sms', 'email', 'authenticator'].includes(method)) {
      throw new AppError('Invalid 2FA method', 400, 'INVALID_2FA_METHOD');
    }

    let qrCodeUrl;
    if (method === 'authenticator') {
      const secret = await generate2FASecret(user.id);
      qrCodeUrl = await getQRCode(user.id, user.email);
    }

    await user.update({
      two_factor_secret: method === 'authenticator' ? user.two_factor_secret : null,
      two_factor_method: method,
    });

    logger.info('2FA toggled', { staffId, method });
    return {
      status: 'enabled',
      method,
      qrCodeUrl: method === 'authenticator' ? qrCodeUrl : null,
    };
  }
}

module.exports = new StaffProfileService();