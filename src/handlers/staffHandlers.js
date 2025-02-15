// src/handlers/staffHandlers.js
const logger = require('@utils/logger');
const { EVENTS } = require('@config/events');
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
} = require('@models');
// Assuming PRIORITY_LEVELS is defined in a separate file or module
const { PRIORITY_LEVELS } = require('@config/constants'); // Adjust the path as necessary

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
    this.handleProfileUpdates(socket, io);
    this.handleAuthenticationRequests(socket, io);
    this.handleTaskAssignments(socket, io);
    this.handleOrderProcessing(socket, io);
    this.handleQuickLinks(socket, io);
    this.handleScheduleUpdates(socket, io);
    this.handleAvailabilityUpdates(socket, io);
    this.handlePerformanceTracking(socket, io);
    this.handleTrainingProgress(socket, io);
    this.handleEarningsManagement(socket, io);
    this.handleTipAllocation(socket, io);
  },

    // Profile Management
    handleProfileUpdates: function(socket, io) {
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.STAFF.PROFILE_UPDATED,
            data: updatedProfile,
            priority: 'MEDIUM'
          });
        } catch (error) {
          logger.error('Profile update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update profile' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update profile' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Authentication Requests
  handleAuthenticationRequests: function(socket, io) {
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.STAFF.PASSWORD_CHANGED,
          data: { message: 'Password updated successfully' },
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Password change error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to change password' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to change password' },
          priority: 'HIGH'
        });
      }
    });

    // Handle 2FA setup
    socket.on(EVENTS.STAFF.TWO_FACTOR_SETUP, async (data) => {
      try {
        const twoFactorSetup = await Staff.setup2FA(socket.user.id);
        socket.emit(EVENTS.STAFF.TWO_FACTOR_COMPLETE, twoFactorSetup);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.STAFF.TWO_FACTOR_COMPLETE,
          data: twoFactorSetup,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('2FA setup error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to setup 2FA' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to setup 2FA' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Task Management
    handleTaskAssignments: function(socket, io) {
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.TASK.ASSIGNMENT_CONFIRMED,
            data: task,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Task acceptance error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to accept task' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to accept task' },
            priority: 'HIGH'
          });
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.TASK.STATUS_UPDATED,
            data: {
              taskId: data.taskId,
              status: data.status,
              timestamp: new Date()
            },
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Task status update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update task status' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update task status' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Order Processing
  handleOrderProcessing: function(socket, io) {
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ORDER.STATUS_UPDATED,
          data: {
            orderId: data.orderId,
            status: data.status,
            timestamp: new Date()
          },
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Order status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update order status' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update order status' },
          priority: 'HIGH'
        });
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ORDER.MODIFIED,
          data: {
            orderId: data.orderId,
            modifications: data.modifications,
            timestamp: new Date()
          },
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Order modification error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to modify order' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to modify order' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Quick Link Management
    handleQuickLinks: function(socket, io) {
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.QUICK_LINK.STAFF_RESPONSE,
            data: {
              requestId: data.requestId,
              response: data.response,
              staffName: response.staffName
            },
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Quick link response error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to respond to quick link request' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to respond to quick link request' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Schedule Management
  handleScheduleUpdates: function(socket, io) {
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.SCHEDULE.AVAILABILITY_UPDATED,
          data: schedule,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Schedule update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update schedule' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update schedule' },
          priority: 'HIGH'
        });
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.SCHEDULE.TIME_OFF_REQUESTED,
          data: request,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Time off request error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to submit time off request' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to submit time off request' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Performance Tracking
    handlePerformanceTracking: function(socket, io) {
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.PERFORMANCE.METRICS_RESPONSE,
            data: metrics,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Performance metrics error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to fetch performance metrics' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to fetch performance metrics' },
            priority: 'HIGH'
          });
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.PERFORMANCE.FEEDBACK_RECORDED,
            data: feedback,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Feedback recording error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to record feedback' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to record feedback' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Training Progress Management
  handleTrainingProgress: function(socket, io) {
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TRAINING.PROGRESS_UPDATED,
          data: progress,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Training progress update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update training progress' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update training progress' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Earnings Management
    handleEarningsManagement: function(socket, io) {
      // Request earnings summary
      socket.on(EVENTS.EARNINGS.GET_SUMMARY, async (data) => {
        try {
          const summary = await Payment.getStaffEarningsSummary({
            staffId: socket.user.id,
            startDate: data.startDate,
            endDate: data.endDate
          });
          socket.emit(EVENTS.EARNINGS.SUMMARY_RESPONSE, summary);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.EARNINGS.SUMMARY_RESPONSE,
            data: summary,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Earnings summary error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to fetch earnings summary' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to fetch earnings summary' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Tip Management
  handleTipAllocation: function(socket, io) {
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TIP.RECORDED,
          data: tip,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Tip recording error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to record tip' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to record tip' },
          priority: 'HIGH'
        });
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TIP.HISTORY_RESPONSE,
          data: history,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Tip history error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch tip history' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to fetch tip history' },
          priority: 'HIGH'
        });
      }
    });
  }
};

module.exports = staffHandlers;

