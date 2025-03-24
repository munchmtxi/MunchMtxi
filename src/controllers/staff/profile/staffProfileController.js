// src/controllers/staff/staffProfileController.js
'use strict';

const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const staffProfileService = require('@services/staff/profile/staffProfileService');

const staffProfileController = {
  /**
   * Get staff profile
   */
  getProfile: catchAsync(async (req, res) => {
    const staffId = req.user.staff_profile?.id;
    if (!staffId) {
      logger.error('Staff profile not found for user', { userId: req.user.id });
      throw new AppError('Staff profile not found for this user', 404, 'STAFF_PROFILE_NOT_FOUND');
    }
    const profile = await staffProfileService.getProfile(staffId);
    logger.info('Staff profile retrieved', { staffId });
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  }),

  /**
   * Update staff personal information
   */
  updatePersonalInfo: catchAsync(async (req, res) => {
    const staffId = req.user.staff_profile?.id;
    if (!staffId) {
      logger.error('Staff profile not found for user', { userId: req.user.id });
      throw new AppError('Staff profile not found for this user', 404, 'STAFF_PROFILE_NOT_FOUND');
    }
    const profile = await staffProfileService.updatePersonalInfo(staffId, req.body);
    logger.info('Staff personal info updated', { staffId });
    res.status(200).json({
      status: 'success',
      message: 'Personal information updated successfully',
      data: profile,
    });
  }),

  /**
   * Update staff vehicle information
   */
  updateVehicleInfo: catchAsync(async (req, res) => {
    const staffId = req.user.staff_profile?.id;
    if (!staffId) {
      logger.error('Staff profile not found for user', { userId: req.user.id });
      throw new AppError('Staff profile not found for this user', 404, 'STAFF_PROFILE_NOT_FOUND');
    }
    const profile = await staffProfileService.updateVehicleInfo(staffId, req.body);
    logger.info('Staff vehicle info updated', { staffId });
    res.status(200).json({
      status: 'success',
      message: 'Vehicle information updated successfully',
      data: profile,
    });
  }),

  /**
   * Change staff password
   */
  changePassword: catchAsync(async ( 받req, res) => {
    const staffId = req.user.staff_profile?.id;
    if (!staffId) {
      logger.error('Staff profile not found for user', { userId: req.user.id });
      throw new AppError('Staff profile not found for this user', 404, 'STAFF_PROFILE_NOT_FOUND');
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new passwords are required', 400, 'MISSING_PASSWORD_FIELDS');
    }
    await staffProfileService.changePassword(staffId, currentPassword, newPassword);
    logger.info('Staff password changed', { staffId });
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  }),

  /**
   * Toggle staff 2FA settings
   */
  toggleTwoFactorAuth: catchAsync(async (req, res) => {
    const staffId = req.user.staff_profile?.id;
    if (!staffId) {
      logger.error('Staff profile not found for user', { userId: req.user.id });
      throw new AppError('Staff profile not found for this user', 404, 'STAFF_PROFILE_NOT_FOUND');
    }
    const { enable, method } = req.body;
    if (enable === undefined || (enable && !method)) {
      throw new AppError('Enable flag and method (if enabling) are required', 400, 'MISSING_2FA_FIELDS');
    }
    const result = await staffProfileService.toggleTwoFactorAuth(staffId, enable, method);
    logger.info('Staff 2FA settings updated', { staffId, enable, method });
    res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication settings updated successfully',
      data: result,
    });
  }),
};

module.exports = staffProfileController;