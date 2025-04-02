'use strict';

const express = require('express');
const DriverOrderController = require('@controllers/driver/driverOrderController');
const DriverOrderMiddleware = require('@middleware/driver/driverOrderMiddleware');
const { Order, Route } = require('@models'); // Ensure models are imported
const AppError = require('@utils/AppError');

const router = express.Router();

// 1. Assign an order to a driver
router.post(
  '/assign/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.ensureDriverAvailability,
  DriverOrderController.assignOrder
);

// 2. Confirm pickup by the driver
router.put(
  '/pickup/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderMiddleware.validatePickupToken,
  DriverOrderController.confirmPickup
);

// 3. Track delivery progress
router.put(
  '/track/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderMiddleware.validateTrackingData,
  DriverOrderController.trackDelivery
);

// 4. Complete the order delivery
router.put(
  '/complete/:order_id',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  DriverOrderMiddleware.verifyOrderOwnership,
  DriverOrderController.completeOrder
);

// 5. Fetch all orders for a driver
router.get(
  '/',
  DriverOrderMiddleware.authenticateDriver,
  DriverOrderMiddleware.restrictToDriver,
  async (req, res, next) => {
    try {
      const { driver_id } = req.query;
      if (!driver_id) {
        return next(new AppError('Driver ID is required', 400));
      }

      const driverId = parseInt(driver_id, 10);
      if (isNaN(driverId)) {
        return next(new AppError('Invalid driver_id: must be an integer', 400));
      }

      const orders = await Order.findAll({
        where: { driver_id: driverId },
        include: [{ model: Route, as: 'route' }],
        logging: (sql) => console.log('Generated SQL:', sql), // Log SQL for debugging
      });

      res.status(200).json({
        status: 'success',
        data: orders,
        message: `Orders retrieved for driver #${driverId}`,
      });
    } catch (error) {
      console.error('Error fetching driver orders:', error.message, error.stack);
      return next(new AppError(`Failed to fetch orders: ${error.message}`, 500));
    }
  }
);

module.exports = router;