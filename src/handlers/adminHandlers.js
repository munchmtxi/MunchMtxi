// src/handlers/adminHandlers.js
const logger = require('@utils/logger');
const events = require('@config/events');
const { 
  Admin,
  Merchant,
  Staff,
  Driver,
  Customer,
  Order,
  Analytics,
  Report,
  SystemMetrics,
  AuditLog,
  ContentManagement,
  Location,
  Configuration
} = require('@models');

// Assuming PRIORITY_LEVELS is defined in a separate file or module
const { PRIORITY_LEVELS } = require('@config/constants'); // Adjust the path as necessary

const adminHandlers = {
  // Room Management
  async joinRooms(socket) {
    try {
      // Admin joins admin-specific room
      socket.join('admin');
      // Join system monitoring room
      socket.join('system:monitoring');
      logger.info(`Admin ${socket.user.id} joined their rooms`);
    } catch (error) {
      logger.error('Error joining admin rooms:', error);
      throw error;
    }
  },
  // Initialize all admin event handlers
  initialize(socket, io) {
    // User Management
    this.handleUserManagement(socket, io);
    this.handleMerchantManagement(socket, io);
    this.handleStaffManagement(socket, io);
    this.handleDriverManagement(socket, io);
    // System Management
    this.handleSystemMonitoring(socket, io);
    this.handleConfigurationManagement(socket, io);
    this.handleLocationManagement(socket, io);
    // Content and Reports
    this.handleContentManagement(socket, io);
    this.handleReportManagement(socket, io);
    // Analytics and Auditing
    this.handleSystemAnalytics(socket, io);
    this.handleAuditLogs(socket, io);
  },

    // User Management
    handleUserManagement(socket, io) {
      // Create new user
      socket.on(EVENTS.ADMIN.CREATE_USER, async (data) => {
        try {
          const user = await Admin.createUser({
            role: data.role,
            userData: data.userData
          });
          socket.emit(EVENTS.ADMIN.USER_CREATED, user);
          logger.info(`Admin ${socket.user.id} created new user ${user.id}`);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ADMIN.USER_CREATED,
            data: user,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('User creation error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to create user' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to create user' },
            priority: 'HIGH'
          });
        }
      });
  
      // Update user status
      socket.on(EVENTS.ADMIN.UPDATE_USER_STATUS, async (data) => {
        try {
          const user = await Admin.updateUserStatus({
            userId: data.userId,
            status: data.status,
            reason: data.reason
          });
          socket.emit(EVENTS.ADMIN.USER_STATUS_UPDATED, user);
          
          // Notify affected user if online with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.USER.STATUS_CHANGED,
            data: {
              status: data.status,
              reason: data.reason
            },
            priority: 'MEDIUM',
            targetRoom: `user:${data.userId}`
          });
        } catch (error) {
          logger.error('User status update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update user status' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update user status' },
            priority: 'HIGH'
          });
        }
      });
  
      // Manage user permissions
      socket.on(EVENTS.ADMIN.UPDATE_PERMISSIONS, async (data) => {
        try {
          const permissions = await Admin.updateUserPermissions({
            userId: data.userId,
            permissions: data.permissions
          });
          socket.emit(EVENTS.ADMIN.PERMISSIONS_UPDATED, permissions);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ADMIN.PERMISSIONS_UPDATED,
            data: permissions,
            priority: 'MEDIUM'
          });
        } catch (error) {
          logger.error('Permission update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update permissions' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update permissions' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Merchant Management with priority
  handleMerchantManagement(socket, io) {
    socket.on(EVENTS.ADMIN.APPROVE_MERCHANT, async (data) => {
      try {
        const merchant = await Merchant.approve({
          merchantId: data.merchantId,
          approvedBy: socket.user.id,
          approvalDetails: data.approvalDetails
        });
        
        // Notify admin of successful approval with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.MERCHANT_APPROVED,
          data: merchant,
          priority: 'HIGH'
        });
        
        // Notify merchant of approval (critical for their business)
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.MERCHANT.APPROVAL_STATUS,
          data: {
            status: 'APPROVED',
            details: data.approvalDetails
          },
          priority: 'CRITICAL',
          targetRoom: `merchant:${data.merchantId}`
        });
      } catch (error) {
        logger.error('Merchant approval error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to approve merchant' },
          priority: 'HIGH'
        });
      }
    });

    socket.on(EVENTS.ADMIN.SUSPEND_MERCHANT, async (data) => {
      try {
        const merchant = await Merchant.suspend({
          merchantId: data.merchantId,
          suspendedBy: socket.user.id,
          reason: data.reason,
          duration: data.duration
        });
        
        // Notify admin of suspension with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.MERCHANT_SUSPENDED,
          data: merchant,
          priority: 'HIGH'
        });
        
        // Notify merchant of suspension (critical priority)
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.MERCHANT.ACCOUNT_SUSPENDED,
          data: {
            reason: data.reason,
            duration: data.duration
          },
          priority: 'CRITICAL',
          targetRoom: `merchant:${data.merchantId}`
        });
      } catch (error) {
        logger.error('Merchant suspension error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to suspend merchant' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Staff Management with priority
    handleStaffManagement(socket, io) {
      socket.on(EVENTS.ADMIN.OVERRIDE_STAFF_PERMISSIONS, async (data) => {
        try {
          const staff = await Staff.overridePermissions({
            staffId: data.staffId,
            permissions: data.permissions,
            reason: data.reason,
            adminId: socket.user.id
          });
          
          // Notify admin of permission override with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ADMIN.STAFF_PERMISSIONS_OVERRIDDEN,
            data: staff,
            priority: 'HIGH'
          });
          
          // Notify merchant of staff permission changes with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.STAFF.PERMISSIONS_CHANGED,
            data: {
              staffId: data.staffId,
              permissions: data.permissions
            },
            priority: 'HIGH',
            targetRoom: `merchant:${staff.merchantId}`
          });
        } catch (error) {
          logger.error('Staff permission override error:', error);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to override staff permissions' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Configuration Management with priority
  handleConfigurationManagement(socket, io) {
    socket.on(EVENTS.ADMIN.UPDATE_CONFIGURATION, async (data) => {
      try {
        const config = await Configuration.update({
          section: data.section,
          changes: data.changes,
          updatedBy: socket.user.id
        });
        
        // Notify admin of config update with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.CONFIGURATION_UPDATED,
          data: config,
          priority: 'HIGH'
        });
        
        // Broadcast configuration changes system-wide with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.SYSTEM.CONFIGURATION_CHANGED,
          data: {
            section: data.section,
            timestamp: new Date()
          },
          priority: 'CRITICAL'
        });
      } catch (error) {
        logger.error('Configuration update error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update configuration' },
          priority: 'HIGH'
        });
      }
    });
  },

  // Location Management with priority
  handleLocationManagement(socket, io) {
    socket.on(EVENTS.ADMIN.UPDATE_LOCATION_SETTINGS, async (data) => {
      try {
        const location = await Location.updateSettings({
          locationId: data.locationId,
          settings: data.settings,
          updatedBy: socket.user.id
        });
        
        // Notify admin of content update with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.LOCATION_SETTINGS_UPDATED,
          data: location,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Location settings update error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update location settings' },
          priority: 'MEDIUM'
        });
      }
    });
  },

  // Content Management with priority
  handleContentManagement(socket, io) {
    socket.on(EVENTS.ADMIN.UPDATE_CONTENT, async (data) => {
      try {
        const content = await ContentManagement.update({
          type: data.type,
          content: data.content,
          updatedBy: socket.user.id
        });
        
        // Notify admin of content update with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.CONTENT_UPDATED,
          data: content,
          priority: 'MEDIUM'
        });
        
        // Broadcast content update to relevant users with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.SYSTEM.CONTENT_UPDATED,
          data: {
            type: data.type,
            timestamp: new Date()
          },
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Content update error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update content' },
          priority: 'MEDIUM'
        });
      }
    });
  },

  // Report Management with priority
  handleReportManagement(socket, io) {
    socket.on(EVENTS.ADMIN.GENERATE_REPORT, async (data) => {
      try {
        const report = await ReportingService.generateSystemReport({
          type: data.type,
          parameters: data.parameters,
          format: data.format
        });
        
        // Notify admin of report generation with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.REPORT_GENERATED,
          data: report,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Report generation error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to generate report' },
          priority: 'LOW'
        });
      }
    });
  },

  // System Analytics with priority
  handleSystemAnalytics(socket, io) {
    socket.on(EVENTS.ADMIN.REQUEST_ANALYTICS, async (data) => {
      try {
        const analytics = await AnalyticsService.getSystemAnalytics({
          metrics: data.metrics,
          timeframe: data.timeframe,
          filters: data.filters
        });
        
        // Notify admin of analytics response with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.ANALYTICS_RESPONSE,
          data: analytics,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Analytics error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to fetch analytics' },
          priority: 'MEDIUM'
        });
      }
    });
  },

  // Audit Logs with priority
  handleAuditLogs(socket, io) {
    socket.on(EVENTS.ADMIN.REQUEST_AUDIT_LOGS, async (data) => {
      try {
        const logs = await AuditLog.get({
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type,
          userId: data.userId
        });
        
        // Notify admin of audit logs response with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.AUDIT_LOGS_RESPONSE,
          data: logs,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Audit log error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to fetch audit logs' },
          priority: 'MEDIUM'
        });
      }
    });

    socket.on(EVENTS.ADMIN.ADD_AUDIT_LOG, async (data) => {
      try {
        const log = await AuditLog.create({
          action: data.action,
          details: data.details,
          adminId: socket.user.id
        });
        
        // Notify admin of audit log addition with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ADMIN.AUDIT_LOG_ADDED,
          data: log,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Audit log creation error:', error);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to create audit log' },
          priority: 'LOW'
        });
      }
    });
  }
};

module.exports = adminHandlers;