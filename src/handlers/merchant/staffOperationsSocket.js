'use strict';

const { logger } = require('@utils/logger');
const MerchantStaffOperationsService = require('@services/merchant/merchantStaffOperationsService');
const STAFF_OPERATIONS_EVENTS = require('@config/events/merchant/staffOperationsEvents');

module.exports = (io, socket) => {
  const staffOperationsService = new MerchantStaffOperationsService(io);

  logger.info('Setting up merchant staff operations socket handlers', { socketId: socket.id });

  socket.on(STAFF_OPERATIONS_EVENTS.RECRUIT_STAFF, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const result = await staffOperationsService.recruitStaff(merchantId, data, socket.request);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Staff recruited', data: result });
    } catch (error) {
      logger.error('Error in recruit staff handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'RECRUIT_STAFF_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.UPDATE_STAFF_ROLE, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId, updates } = data;
      const token = socket.request.headers.authorization.split(' ')[1];
      const result = await staffOperationsService.updateStaffRole(merchantId, staffId, updates, token);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Staff role updated', data: result });
    } catch (error) {
      logger.error('Error in update staff role handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'UPDATE_ROLE_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.REMOVE_STAFF, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId } = data;
      const token = socket.request.headers.authorization.split(' ')[1];
      const result = await staffOperationsService.removeStaff(merchantId, staffId, token);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Staff removed', data: result });
    } catch (error) {
      logger.error('Error in remove staff handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'REMOVE_STAFF_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.ASSIGN_TASK, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId, taskType, taskId, geoData } = data;
      const result = await staffOperationsService.assignStaffToTask(merchantId, staffId, taskType, taskId, geoData);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Task assigned', data: result });
    } catch (error) {
      logger.error('Error in assign task handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'ASSIGN_TASK_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.GET_TASKS, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId } = data;
      const tasks = await staffOperationsService.getStaffTasks(merchantId, staffId);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Tasks retrieved', data: tasks });
    } catch (error) {
      logger.error('Error in get tasks handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'GET_TASKS_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.SET_AVAILABILITY, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId, availabilityStatus } = data;
      const result = await staffOperationsService.manageStaffAvailability(merchantId, staffId, availabilityStatus);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Availability updated', data: result });
    } catch (error) {
      logger.error('Error in set availability handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'SET_AVAILABILITY_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.GET_PERFORMANCE, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { staffId, period } = data;
      const performance = await staffOperationsService.getStaffPerformance(merchantId, staffId, period);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Performance retrieved', data: performance });
    } catch (error) {
      logger.error('Error in get performance handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'GET_PERFORMANCE_ERROR' });
    }
  });

  socket.on(STAFF_OPERATIONS_EVENTS.GENERATE_REPORT, async (data) => {
    try {
      const merchantId = socket.user.merchantId;
      const { period } = data;
      const report = await staffOperationsService.generateStaffReport(merchantId, period);
      socket.emit(STAFF_OPERATIONS_EVENTS.SUCCESS, { message: 'Report generated', data: report });
    } catch (error) {
      logger.error('Error in generate report handler', { error: error.message, socketId: socket.id });
      socket.emit(STAFF_OPERATIONS_EVENTS.ERROR, { message: error.message, code: 'GENERATE_REPORT_ERROR' });
    }
  });
};