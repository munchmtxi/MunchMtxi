'use strict';

const express = require('express');
const staffMiddleware = require('@middleware/staff/staffMiddleware');
const AvailabilityController = require('@controllers/staff/availabilityController');

const router = express.Router();

module.exports = function setupAvailabilityRoutes(app) {
  const io = app.locals.io;
  const notificationService = app.locals.notificationService;

  if (!io || !notificationService) {
    throw new Error('Required dependencies (io or notificationService) not found in app.locals');
  }

  const controller = new AvailabilityController(io, notificationService);

  router.use(staffMiddleware.authenticateStaff);

  router.post(
    '/availability',
    staffMiddleware.restrictToPositions('manager', 'waiter', 'chef', 'Order Coordinator'), // Added 'Order Coordinator'
    controller.setAvailability.bind(controller)
  );

  router.post(
    '/assign',
    staffMiddleware.restrictToPositions('manager'),
    controller.assignStaff.bind(controller)
  );

  router.get(
    '/available',
    staffMiddleware.restrictToPositions('manager'),
    controller.getAvailableStaff.bind(controller)
  );

  app.use('/api/v1/staff', router);
};