// src/controllers/driver/driverAvailabilityController.js

const DriverAvailabilityService = require('@services/driver/driverAvailabilityService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');

const driverAvailabilityController = {
  // Set driver shift
  setShift: catchAsync(async (req, res, next) => {
    const { driverId } = req.params;
    const shiftData = req.body;

    const result = await DriverAvailabilityService.setDriverShift(driverId, shiftData);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }),

  // Get driver availability
  getAvailability: catchAsync(async (req, res, next) => {
    const { driverId } = req.params;

    const result = await DriverAvailabilityService.getDriverAvailability(driverId);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }),

  // Toggle online status
  toggleStatus: catchAsync(async (req, res, next) => {
    const { driverId } = req.params;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return next(new AppError('isOnline must be a boolean', 400));
    }

    const result = await DriverAvailabilityService.toggleOnlineStatus(driverId, isOnline);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }),

  // Simulate availability (for testing)
  simulateAvailability: catchAsync(async (req, res, next) => {
    const { driverId } = req.params;

    const result = await DriverAvailabilityService.simulateAvailability(driverId);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }),

  // Get device status
  getDeviceStatus: catchAsync(async (req, res, next) => {
    const { driverId } = req.params;

    const result = await DriverAvailabilityService.getDeviceStatus(driverId);

    res.status(200).json({
      status: 'success',
      data: result
    });
  })
};

module.exports = driverAvailabilityController;