'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const staffOperationsController = require('@controllers/merchant/staffOperationsController');
const { merchantStaffOperationsMiddleware } = require('@middleware/merchant/staffOperationsMiddleware');
const { logger } = require('@utils/logger');

module.exports = (io) => {
  const controller = staffOperationsController(io);

  router.post('/recruit', merchantStaffOperationsMiddleware, controller.recruitStaff);
  router.patch('/:staffId/role', merchantStaffOperationsMiddleware, controller.updateStaffRole);
  router.delete('/:staffId', merchantStaffOperationsMiddleware, controller.removeStaff);
  router.post('/:staffId/task/:taskType/:taskId', merchantStaffOperationsMiddleware, controller.assignStaffToTask);
  router.get('/:staffId/tasks', merchantStaffOperationsMiddleware, controller.getStaffTasks);
  router.patch('/:staffId/availability', merchantStaffOperationsMiddleware, controller.manageStaffAvailability);
  router.get('/:staffId/performance', merchantStaffOperationsMiddleware, controller.getStaffPerformance);
  router.get('/report', merchantStaffOperationsMiddleware, controller.getStaffReport); // Changed to getStaffReport

  return router;
};