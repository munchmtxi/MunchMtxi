// src/handlers/staffHandlers.js
const logger = require('../utils/logger');
const { EVENTS } = require('../config/events');
const { 
  Staff, 
  Order, 
  Task,
  TableBooking,
  Payment,
  Performance,
  Training,
  Schedule,
  QuickLink
} = require('../models');
const NotificationService = require('../services/notificationService');
const PerformanceService = require('../services/performanceService');
const SchedulingService = require('../services/schedulingService');

const staffHandlers = {
  // Room Management
  async joinRooms(socket) {
    try {
      const staff = await Staff.findOne({ 
        where: { userId: socket.user.id },
        include: ['assignedTasks', 'activeOrders', 'assignedTables'] 
      });

      if (staff) {
        // Join staff-specific room
        socket.join(`staff:${staff.id}`);
        
        // Join merchant room
        socket.join(`merchant:${staff.merchantId}`);
        
        // Join task rooms
        staff.assignedTasks?.forEach(task => {
          socket.join(`task:${task.id}`);
        });

        // Join order rooms
        staff.activeOrders?.forEach(order => {
          socket.join(`order:${order.id}`);
        });

        // Join table rooms
        staff.assignedTables?.forEach(table => {
          socket.join(`table:${table.id}`);
        });

        logger.info(`Staff ${staff.id} joined their rooms`);
      }
    } catch (error) {
      logger.error('Error joining staff rooms:', error);
      throw error;
    }
  },

  // Initialize all staff event handlers
  initialize(socket, io) {
    // Profile and Authentication Management
    this.handleProfileUpdates(socket, io);
    this.handleAuthenticationRequests(socket, io);
    
    // Task and Order Management
    this.handleTaskAssignments(socket, io);
    this.handleOrderProcessing(socket, io);
    this.handleQuickLinks(socket, io);
    
    // Schedule and Availability Management
    this.handleScheduleUpdates(socket, io);
    this.handleAvailabilityUpdates(socket, io);
    
    // Performance and Training
    this.handlePerformanceTracking(socket, io);
    this.handleTrainingProgress(socket, io);
    
    // Earnings and Tips
    this.handleEarningsManagement(socket, io);
    this.handleTipAllocation(socket, io);
  },

  // Profile Management
  handleProfileUpdates(socket, io) {
    socket.on(EVENTS.STAFF.PROFILE_UPDATE, async (data) => {
      try {
        const updatedProfile = await Staff.update(socket.user.id, {
          name: data.name,
          phoneNumber: data.phoneNumber,
          emergencyContact: data.emergencyContact,
          preferences: data.preferences
        });

        socket.emit(EVENTS.STAFF.PROFILE_UPDATED, updatedProfile);
        logger.info(`Staff ${socket.user.id} profile updated`);
      } catch (error) {
        logger.error('Profile update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update profile' });
      }
    });
  },

  // Authentication Requests
  handleAuthenticationRequests(socket, io) {
    // Handle password changes
    socket.on(EVENTS.STAFF.CHANGE_PASSWORD, async (data) => {
      try {
        await Staff.updatePassword(socket.user.id, {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        });

        socket.emit(EVENTS.STAFF.PASSWORD_CHANGED, {
          message: 'Password updated successfully'
        });
      } catch (error) {
        logger.error('Password change error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to change password' });
      }
    });

    // Handle 2FA setup
    socket.on(EVENTS.STAFF.SETUP_2FA, async (data) => {
      try {
        const twoFactorSetup = await Staff.setup2FA(socket.user.id);
        socket.emit(EVENTS.STAFF.2FA_SETUP_COMPLETE, twoFactorSetup);
      } catch (error) {
        logger.error('2FA setup error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to setup 2FA' });
      }
    });
  },

  // Task Management
  handleTaskAssignments(socket, io) {
    // Accept task assignment
    socket.on(EVENTS.TASK.ACCEPT, async (data) => {
      try {
        const task = await Task.accept({
          taskId: data.taskId,
          staffId: socket.user.id
        });

        socket.join(`task:${data.taskId}`);

        // Notify merchant
        io.to(`merchant:${task.merchantId}`).emit(EVENTS.TASK.STAFF_ASSIGNED, {
          taskId: task.id,
          staffDetails: await Staff.getPublicProfile(socket.user.id)
        });

        socket.emit(EVENTS.TASK.ASSIGNMENT_CONFIRMED, task);
      } catch (error) {
        logger.error('Task acceptance error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to accept task' });
      }
    });

    // Update task status
    socket.on(EVENTS.TASK.UPDATE_STATUS, async (data) => {
      try {
        const task = await Task.updateStatus(data.taskId, data.status);

        io.to(`task:${data.taskId}`).emit(EVENTS.TASK.STATUS_UPDATED, {
          taskId: data.taskId,
          status: data.status,
          timestamp: new Date()
        });

        // Record performance metrics
        await PerformanceService.recordTaskCompletion({
          staffId: socket.user.id,
          taskId: data.taskId,
          completionTime: data.completionTime
        });
      } catch (error) {
        logger.error('Task status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update task status' });
      }
    });
  },

  // Order Processing
  handleOrderProcessing(socket, io) {
    // Update order status
    socket.on(EVENTS.ORDER.UPDATE_STATUS, async (data) => {
      try {
        const order = await Order.updateStatus(data.orderId, {
          status: data.status,
          updatedBy: socket.user.id
        });

        io.to(`order:${data.orderId}`).emit(EVENTS.ORDER.STATUS_UPDATED, {
          orderId: data.orderId,
          status: data.status,
          timestamp: new Date()
        });

        // Notify customer if status is significant
        if (['PREPARING', 'READY', 'COMPLETED'].includes(data.status)) {
          io.to(`customer:${order.customerId}`).emit(EVENTS.ORDER.STATUS_CHANGED, {
            orderId: data.orderId,
            status: data.status,
            timestamp: new Date()
          });
        }
      } catch (error) {
        logger.error('Order status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update order status' });
      }
    });

    // Handle order modifications
    socket.on(EVENTS.ORDER.MODIFY, async (data) => {
      try {
        const modifiedOrder = await Order.modify({
          orderId: data.orderId,
          modifications: data.modifications,
          reason: data.reason,
          staffId: socket.user.id
        });

        io.to(`order:${data.orderId}`).emit(EVENTS.ORDER.MODIFIED, {
          orderId: data.orderId,
          modifications: data.modifications,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Order modification error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to modify order' });
      }
    });
  },

  // Quick Link Management
  handleQuickLinks(socket, io) {
    // Handle quick link requests
    socket.on(EVENTS.QUICK_LINK.RESPOND, async (data) => {
      try {
        const response = await QuickLink.respond({
          requestId: data.requestId,
          staffId: socket.user.id,
          response: data.response,
          actionTaken: data.actionTaken
        });

        io.to(`customer:${response.customerId}`).emit(EVENTS.QUICK_LINK.STAFF_RESPONSE, {
          requestId: data.requestId,
          response: data.response,
          staffName: response.staffName
        });
      } catch (error) {
        logger.error('Quick link response error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to respond to quick link request' });
      }
    });
  },

  // Schedule Management
  handleScheduleUpdates(socket, io) {
    // Update availability
    socket.on(EVENTS.SCHEDULE.UPDATE_AVAILABILITY, async (data) => {
      try {
        const schedule = await Schedule.updateAvailability({
          staffId: socket.user.id,
          availability: data.availability
        });

        socket.emit(EVENTS.SCHEDULE.AVAILABILITY_UPDATED, schedule);
        
        // Notify merchant of availability update
        io.to(`merchant:${schedule.merchantId}`).emit(EVENTS.SCHEDULE.STAFF_AVAILABILITY_CHANGED, {
          staffId: socket.user.id,
          availability: data.availability
        });
      } catch (error) {
        logger.error('Schedule update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update schedule' });
      }
    });

    // Request time off
    socket.on(EVENTS.SCHEDULE.REQUEST_TIME_OFF, async (data) => {
      try {
        const request = await Schedule.requestTimeOff({
          staffId: socket.user.id,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason
        });

        socket.emit(EVENTS.SCHEDULE.TIME_OFF_REQUESTED, request);
        
        // Notify merchant of time off request
        io.to(`merchant:${request.merchantId}`).emit(EVENTS.SCHEDULE.TIME_OFF_REQUEST_RECEIVED, {
          staffId: socket.user.id,
          request: request
        });
      } catch (error) {
        logger.error('Time off request error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to submit time off request' });
      }
    });
  },

  // Performance Tracking
  handlePerformanceTracking(socket, io) {
    // Request performance metrics
    socket.on(EVENTS.PERFORMANCE.GET_METRICS, async (data) => {
      try {
        const metrics = await Performance.getMetrics({
          staffId: socket.user.id,
          startDate: data.startDate,
          endDate: data.endDate,
          metricTypes: data.metricTypes
        });

        socket.emit(EVENTS.PERFORMANCE.METRICS_RESPONSE, metrics);
      } catch (error) {
        logger.error('Performance metrics error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch performance metrics' });
      }
    });

    // Record feedback
    socket.on(EVENTS.PERFORMANCE.RECORD_FEEDBACK, async (data) => {
      try {
        const feedback = await Performance.recordFeedback({
          staffId: socket.user.id,
          type: data.type,
          content: data.content,
          source: data.source
        });

        socket.emit(EVENTS.PERFORMANCE.FEEDBACK_RECORDED, feedback);
      } catch (error) {
        logger.error('Feedback recording error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to record feedback' });
      }
    });
  },

  // Training Progress Management
  handleTrainingProgress(socket, io) {
    // Update training progress
    socket.on(EVENTS.TRAINING.UPDATE_PROGRESS, async (data) => {
      try {
        const progress = await Training.updateProgress({
          staffId: socket.user.id,
          moduleId: data.moduleId,
          progress: data.progress,
          completionStatus: data.completionStatus
        });

        socket.emit(EVENTS.TRAINING.PROGRESS_UPDATED, progress);

        // If training completed, notify merchant
        if (data.completionStatus === 'COMPLETED') {
          io.to(`merchant:${progress.merchantId}`).emit(EVENTS.TRAINING.MODULE_COMPLETED, {
            staffId: socket.user.id,
            moduleId: data.moduleId
          });
        }
      } catch (error) {
        logger.error('Training progress update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update training progress' });
      }
    });
  },

  // Earnings Management
  handleEarningsManagement(socket, io) {
    // Request earnings summary
    socket.on(EVENTS.EARNINGS.GET_SUMMARY, async (data) => {
      try {
        const summary = await Payment.getStaffEarningsSummary({
          staffId: socket.user.id,
          startDate: data.startDate,
          endDate: data.endDate
        });

        socket.emit(EVENTS.EARNINGS.SUMMARY_RESPONSE, summary);
      } catch (error) {
        logger.error('Earnings summary error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch earnings summary' });
      }
    });
  },

  // Tip Management
  handleTipAllocation(socket, io) {
    // Record received tip
    socket.on(EVENTS.TIP.RECORD, async (data) => {
      try {
        const tip = await Payment.recordTip({
          staffId: socket.user.id,
          orderId: data.orderId,
          amount: data.amount,
          type: data.type
        });

        socket.emit(EVENTS.TIP.RECORDED, tip);
      } catch (error) {
        logger.error('Tip recording error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to record tip' });
      }
    });

    // Request tip history
    socket.on(EVENTS.TIP.GET_HISTORY, async (data) => {
      try {
        const history = await Payment.getTipHistory({
          staffId: socket.user.id,
          startDate: data.startDate,
          endDate: data.endDate
        });

        socket.emit(EVENTS.TIP.HISTORY_RESPONSE, history);
      } catch (error) {
        logger.error('Tip history error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch tip history' });
      }
    });
  }
};

module.exports = staffHandlers;