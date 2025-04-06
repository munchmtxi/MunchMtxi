'use strict';

const StaffDriverCoordinationService = require('@services/staff/StaffDriverCoordinationService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');

class StaffDriverCoordinationController {
  constructor(io) {
    this.service = new StaffDriverCoordinationService(io);
  }

  async assignDriver(req, res, next) {
    try {
      const { staffId } = req.user;
      const { orderId, driverId } = req.body;

      if (!orderId) {
        throw new AppError('Order ID is required', 400, 'MISSING_ORDER_ID');
      }

      const order = await this.service.assignDriver(staffId, orderId, driverId);
      logger.info(`Driver assigned to order ${orderId} by staff ${staffId}`, { driverId });

      res.status(200).json({
        status: 'success',
        data: {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            driverId: order.driver_id,
            status: order.status,
          },
        },
      });
    } catch (error) {
      logger.error('Error in assignDriver controller', { error: error.message });
      next(error);
    }
  }

  async confirmPickup(req, res, next) {
    try {
      const { staffId } = req.user;
      const { orderId, driverToken } = req.body;

      if (!orderId || !driverToken) {
        throw new AppError('Order ID and driver token are required', 400, 'MISSING_FIELDS');
      }

      const order = await this.service.confirmPickup(staffId, orderId, driverToken);
      logger.info(`Pickup confirmed for order ${orderId} by staff ${staffId}`);

      res.status(200).json({
        status: 'success',
        data: {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
          },
        },
      });
    } catch (error) {
      logger.error('Error in confirmPickup controller', { error: error.message });
      next(error);
    }
  }

  async trackDelivery(req, res, next) {
    try {
      const { staffId } = req.user;
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID is required', 400, 'MISSING_ORDER_ID');
      }

      const trackingData = await this.service.trackDelivery(staffId, orderId);
      logger.info(`Delivery tracked for order ${orderId} by staff ${staffId}`);

      res.status(200).json({
        status: 'success',
        data: trackingData,
      });
    } catch (error) {
      logger.error('Error in trackDelivery controller', { error: error.message });
      next(error);
    }
  }

  async completeOrder(req, res, next) {
    try {
      const { staffId } = req.user;
      const { orderId } = req.body;

      if (!orderId) {
        throw new AppError('Order ID is required', 400, 'MISSING_ORDER_ID');
      }

      const order = await this.service.completeOrder(staffId, orderId);
      logger.info(`Order ${orderId} completed by staff ${staffId}`);

      res.status(200).json({
        status: 'success',
        data: {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            actualDeliveryTime: order.actual_delivery_time,
          },
        },
      });
    } catch (error) {
      logger.error('Error in completeOrder controller', { error: error.message });
      next(error);
    }
  }

  async getDriverOrderOverview(req, res, next) {
    try {
      const { staffId } = req.user;
      const { branchId } = req.params;

      if (!branchId) {
        throw new AppError('Branch ID is required', 400, 'MISSING_BRANCH_ID');
      }

      const overview = await this.service.getDriverOrderOverview(staffId, branchId);
      logger.info(`Driver order overview retrieved for branch ${branchId} by staff ${staffId}`);

      res.status(200).json({
        status: 'success',
        data: {
          orders: overview,
          total: overview.length,
        },
      });
    } catch (error) {
      logger.error('Error in getDriverOrderOverview controller', { error: error.message });
      next(error);
    }
  }
}

module.exports = StaffDriverCoordinationController;