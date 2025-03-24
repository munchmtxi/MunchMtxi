'use strict';

const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const driverProfileService = require('@services/driver/profile/driverProfileService');

const driverProfileController = {
  getProfile: catchAsync(async (req, res) => {
    const driverId = req.user.driver_profile?.id;
    if (!driverId) {
      logger.error('Driver profile not found for user', { userId: req.user.id });
      throw new AppError('Driver profile not found for this user', 404, 'DRIVER_PROFILE_NOT_FOUND');
    }
    const profile = await driverProfileService.getProfile(driverId);
    logger.info('Driver profile retrieved', { driverId });
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  }),

  updatePersonalInfo: catchAsync(async (req, res) => {
    const driverId = req.user.driver_profile?.id;
    if (!driverId) {
      logger.error('Driver profile not found for user', { userId: req.user.id });
      throw new AppError('Driver profile not found for this user', 404, 'DRIVER_PROFILE_NOT_FOUND');
    }
    const profile = await driverProfileService.updatePersonalInfo(driverId, req.body);
    logger.info('Driver personal info updated', { driverId });
    res.status(200).json({
      status: 'success',
      message: 'Personal information updated successfully',
      data: profile,
    });
  }),

  updateVehicleInfo: catchAsync(async (req, res) => {
    const driverId = req.user.driver_profile?.id;
    if (!driverId) {
      logger.error('Driver profile not found for user', { userId: req.user.id });
      throw new AppError('Driver profile not found for this user', 404, 'DRIVER_PROFILE_NOT_FOUND');
    }
    const profile = await driverProfileService.updateVehicleInfo(driverId, req.body);
    logger.info('Driver vehicle info updated', { driverId });
    res.status(200).json({
      status: 'success',
      message: 'Vehicle information updated successfully',
      data: profile,
    });
  }),

  changePassword: catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new passwords are required', 400, 'MISSING_PASSWORD_FIELDS');
    }
    logger.info('START: Controller changePassword', { userId: req.user.id, body: req.body });
    await driverProfileService.changePassword(req.user, currentPassword, newPassword);
    logger.info('END: Controller changePassword', { userId: req.user.id });
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  }),
};

module.exports = driverProfileController;