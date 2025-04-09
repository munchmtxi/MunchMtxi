'use strict';

const express = require('express');
const router = express.Router();
const staffOperationsController = require('@controllers/merchant/staffOperationsController');
const { merchantStaffOperationsMiddleware } = require('@middleware/merchant/staffOperationsMiddleware');

module.exports = (io) => {
  const controller = staffOperationsController(io);

  router.post('/staff/recruit', merchantStaffOperationsMiddleware, controller.recruitStaff);
  router.patch('/staff/:staffId/role', merchantStaffOperationsMiddleware, controller.updateStaffRole);
  router.delete('/staff/:staffId', merchantStaffOperationsMiddleware, controller.removeStaff);
  router.post('/staff/:staffId/task/:taskType/:taskId', merchantStaffOperationsMiddleware, controller.assignStaffToTask);
  router.get('/staff/:staffId/tasks', merchantStaffOperationsMiddleware, controller.getStaffTasks);
  router.patch('/staff/:staffId/availability', merchantStaffOperationsMiddleware, controller.manageStaffAvailability);
  router.get('/staff/:staffId/performance', merchantStaffOperationsMiddleware, controller.getStaffPerformance);
  router.get('/staff/report', merchantStaffOperationsMiddleware, controller.generateStaffReport);

  return router;
};