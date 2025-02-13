'use strict';
const { Device, sequelize } = require('@models');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');

/**
 * Enhanced trackDevice function to handle more device information.
 * @param {Number} userId - ID of the user.
 * @param {Object} deviceInfo - Information about the device.
 */
const trackDevice = async (userId, deviceInfo) => {
  const {
    deviceId,
    deviceType,
    os,
    osVersion,
    browser,
    browserVersion,
    screenResolution,
    preferredLanguage
  } = deviceInfo;

  const device = await Device.findOne({ where: { user_id: userId, device_id: deviceId } });
  
  if (device) {
    await device.update({
      last_used_at: new Date(),
      os,
      os_version: osVersion,
      browser,
      browser_version: browserVersion,
      screen_resolution: screenResolution,
      preferred_language: preferredLanguage
    });
  } else {
    await Device.create({
      user_id: userId,
      device_id: deviceId,
      device_type: deviceType,
      os,
      os_version: osVersion,
      browser,
      browser_version: browserVersion,
      screen_resolution: screenResolution,
      preferred_language: preferredLanguage
    });
  }
};

/**
 * Retrieves all devices for a user.
 * @param {Number} userId - ID of the user.
 * @returns {Array} - Array of devices.
 */
const getUserDevices = async (userId) => {
  return await Device.findAll({ where: { user_id: userId } });
};

/**
 * Removes a device for a user.
 * @param {Number} userId - ID of the user.
 * @param {String} deviceId - ID of the device to remove.
 */
const removeDevice = async (userId, deviceId) => {
  const device = await Device.findOne({ where: { user_id: userId, device_id: deviceId } });
  if (!device) throw new AppError('Device not found', 404);
  await device.destroy();
};

/**
 * Get device analytics for a specific time period.
 * @param {Date} startDate - Start date for analytics.
 * @param {Date} endDate - End date for analytics.
 */
const getDeviceAnalytics = async (startDate, endDate) => {
  const analytics = await Device.findAll({
    where: {
      last_used_at: {
        [Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'device_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
    ],
    group: ['device_type']
  });

  const browserAnalytics = await Device.findAll({
    attributes: [
      'browser',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['browser']
  });

  const osAnalytics = await Device.findAll({
    attributes: [
      'os',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['os']
  });

  return {
    deviceTypes: analytics,
    browsers: browserAnalytics,
    operatingSystems: osAnalytics
  };
};

module.exports = {
  trackDevice,
  getUserDevices,
  removeDevice,
  getDeviceAnalytics
};
