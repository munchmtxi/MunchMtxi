// src/services/deviceService.js
const { Device } = require('@models');
const AppError = require('@utils/AppError');

/**
 * Tracks or updates a device for a user.
 * @param {Number} userId - ID of the user.
 * @param {Object} deviceInfo - Information about the device.
 */
const trackDevice = async (userId, deviceInfo) => {
  const { deviceId, deviceType } = deviceInfo;
  const device = await Device.findOne({ where: { userId, deviceId } });
  if (device) {
    device.lastUsedAt = new Date();
    await device.save();
  } else {
    await Device.create({ userId, deviceId, deviceType });
  }
};

/**
 * Retrieves all devices for a user.
 * @param {Number} userId - ID of the user.
 * @returns {Array} - Array of devices.
 */
const getUserDevices = async (userId) => {
  return await Device.findAll({ where: { userId } });
};

/**
 * Removes a device for a user.
 * @param {Number} userId - ID of the user.
 * @param {String} deviceId - ID of the device to remove.
 */
const removeDevice = async (userId, deviceId) => {
  const device = await Device.findOne({ where: { userId, deviceId } });
  if (!device) throw new AppError('Device not found', 404);
  await device.destroy();
};

module.exports = { trackDevice, getUserDevices, removeDevice };
