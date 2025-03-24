'use strict';

const { Driver } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const attachDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id },
    });

    if (!driver) {
      logger.error('Driver profile not found for authenticated user', { userId: req.user.id });
      throw new AppError('Driver profile not found', 404, 'DRIVER_PROFILE_NOT_FOUND');
    }

    req.user.driver_profile = driver;
    logger.info('Driver profile attached to request', { driverId: driver.id });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { attachDriverProfile };