'use strict';

const DriverOrderService = require('@services/driver/driverOrderService');
const { catchAsync } = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class DriverOrderController {
  /**
   * Assign an order to a driver
   */
  static async assignOrder(req, res, next) {
    return catchAsync(async (req, res, next) => {
      const { order_id } = req.params;
      const { driver_id } = req.body;

      if (!order_id || !driver_id) {
        throw new AppError('Order ID and Driver ID are required', 400, 'MISSING_FIELDS');
      }

      const result = await DriverOrderService.assignOrder({ order_id, driver_id });

      logger.info('Order assigned via controller', { order_id, driver_id });

      return res.status(200).json({
        status: 'success',
        data: result,
        message: `Order #${order_id} assigned to driver #${driver_id}`,
      });
    })(req, res, next);
  }

  /**
   * Confirm pickup of the order by the driver
   */
  static async confirmPickup(req, res, next) {
    return catchAsync(async (req, res, next) => {
      const { order_id } = req.params;
      const { driver_id } = req.user; // Assuming driver_id comes from auth middleware
      const { token } = req.headers; // Token from header for verification

      if (!order_id || !token) {
        throw new AppError('Order ID and token are required', 400, 'MISSING_FIELDS');
      }

      const result = await DriverOrderService.confirmPickup({ order_id, driver_id, token });

      logger.info('Pickup confirmed via controller', { order_id, driver_id });

      return res.status(200).json({
        status: 'success',
        data: result,
        message: `Pickup confirmed for order #${order_id}`,
      });
    })(req, res, next);
  }

  /**
   * Track the delivery progress
   */
  static async trackDelivery(req, res, next) {
    return catchAsync(async (req, res, next) => {
      const { order_id } = req.params;
      const { driver_id } = req.user; // From auth middleware
      const { current_location } = req.body; // Expected format: { lat, lng }

      if (!order_id || !current_location || !current_location.lat || !current_location.lng) {
        throw new AppError('Order ID and current location (lat, lng) are required', 400, 'MISSING_FIELDS');
      }

      const result = await DriverOrderService.trackDelivery({ order_id, driver_id, current_location });

      logger.info('Delivery tracked via controller', { order_id, driver_id });

      return res.status(200).json({
        status: 'success',
        data: result,
        message: `Delivery tracking updated for order #${order_id}`,
      });
    })(req, res, next);
  }

  /**
   * Complete the order delivery
   */
  static async completeOrder(req, res, next) {
    return catchAsync(async (req, res, next) => {
      const { order_id } = req.params;
      const { driver_id } = req.user; // From auth middleware

      if (!order_id) {
        throw new AppError('Order ID is required', 400, 'MISSING_FIELDS');
      }

      const result = await DriverOrderService.completeOrder({ order_id, driver_id });

      logger.info('Order completed via controller', { order_id, driver_id });

      return res.status(200).json({
        status: 'success',
        data: result,
        message: `Order #${order_id} completed`,
      });
    })(req, res, next);
  }
}

module.exports = DriverOrderController;