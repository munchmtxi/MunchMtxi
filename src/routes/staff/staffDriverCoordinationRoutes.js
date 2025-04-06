'use strict';

const express = require('express');
const StaffDriverCoordinationController = require('@controllers/staff/StaffDriverCoordinationController');
const staffAuthMiddleware = require('@middleware/staff/staffAuthMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

module.exports = (app) => {
  const controller = new StaffDriverCoordinationController(app.locals.io);

  router.post('/assign-driver', staffAuthMiddleware, controller.assignDriver.bind(controller));
  router.post('/confirm-pickup', staffAuthMiddleware, controller.confirmPickup.bind(controller));
  router.get('/track-delivery/:orderId', staffAuthMiddleware, controller.trackDelivery.bind(controller));
  router.post('/complete-order', staffAuthMiddleware, controller.completeOrder.bind(controller));
  router.get('/driver-overview/:branchId', staffAuthMiddleware, controller.getDriverOrderOverview.bind(controller));

  app.use('/api/v1/staff/driver-coordination', router);
  logger.info('Staff driver coordination routes mounted at /api/v1/staff/driver-coordination');
};