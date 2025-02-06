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
//const NotificationService = require('../services/notificationService');
//const AnalyticsService = require('../services/analyticsService');
//const ReportingService = require('../services/reportingService');
//const MonitoringService = require('../services/monitoringService');

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
      } catch (error) {
        logger.error('User creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to create user' });
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

        // Notify affected user if online
        io.to(`user:${data.userId}`).emit(EVENTS.USER.STATUS_CHANGED, {
          status: data.status,
          reason: data.reason
        });
      } catch (error) {
        logger.error('User status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update user status' });
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
      } catch (error) {
        logger.error('Permission update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update permissions' });
      }
    });
  },

  // Merchant Management
  handleMerchantManagement(socket, io) {
    // Approve merchant registration
    socket.on(EVENTS.ADMIN.APPROVE_MERCHANT, async (data) => {
      try {
        const merchant = await Merchant.approve({
          merchantId: data.merchantId,
          approvedBy: socket.user.id,
          approvalDetails: data.approvalDetails
        });

        socket.emit(EVENTS.ADMIN.MERCHANT_APPROVED, merchant);

        // Notify merchant
        io.to(`merchant:${data.merchantId}`).emit(EVENTS.MERCHANT.APPROVAL_STATUS, {
          status: 'APPROVED',
          details: data.approvalDetails
        });
      } catch (error) {
        logger.error('Merchant approval error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to approve merchant' });
      }
    });

    // Suspend merchant operations
    socket.on(EVENTS.ADMIN.SUSPEND_MERCHANT, async (data) => {
      try {
        const merchant = await Merchant.suspend({
          merchantId: data.merchantId,
          suspendedBy: socket.user.id,
          reason: data.reason,
          duration: data.duration
        });

        socket.emit(EVENTS.ADMIN.MERCHANT_SUSPENDED, merchant);

        // Notify merchant
        io.to(`merchant:${data.merchantId}`).emit(EVENTS.MERCHANT.ACCOUNT_SUSPENDED, {
          reason: data.reason,
          duration: data.duration
        });
      } catch (error) {
        logger.error('Merchant suspension error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to suspend merchant' });
      }
    });
  },

  // Staff Management
  handleStaffManagement(socket, io) {
    // Override staff permissions
    socket.on(EVENTS.ADMIN.OVERRIDE_STAFF_PERMISSIONS, async (data) => {
      try {
        const staff = await Staff.overridePermissions({
          staffId: data.staffId,
          permissions: data.permissions,
          reason: data.reason,
          adminId: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.STAFF_PERMISSIONS_OVERRIDDEN, staff);

        // Notify merchant
        io.to(`merchant:${staff.merchantId}`).emit(EVENTS.STAFF.PERMISSIONS_CHANGED, {
          staffId: data.staffId,
          permissions: data.permissions
        });
      } catch (error) {
        logger.error('Staff permission override error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to override staff permissions' });
      }
    });
  },

  // Driver Management
  handleDriverManagement(socket, io) {
    // Approve driver registration
    socket.on(EVENTS.ADMIN.APPROVE_DRIVER, async (data) => {
      try {
        const driver = await Driver.approve({
          driverId: data.driverId,
          approvedBy: socket.user.id,
          verificationDetails: data.verificationDetails
        });

        socket.emit(EVENTS.ADMIN.DRIVER_APPROVED, driver);

        // Notify driver
        io.to(`driver:${data.driverId}`).emit(EVENTS.DRIVER.APPROVAL_STATUS, {
          status: 'APPROVED',
          details: data.verificationDetails
        });
      } catch (error) {
        logger.error('Driver approval error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to approve driver' });
      }
    });
  },

  // System Monitoring
  handleSystemMonitoring(socket, io) {
    // Monitor system metrics
    socket.on(EVENTS.ADMIN.REQUEST_SYSTEM_METRICS, async (data) => {
      try {
        const metrics = await MonitoringService.getMetrics({
          metricTypes: data.metricTypes,
          timeframe: data.timeframe
        });

        socket.emit(EVENTS.ADMIN.SYSTEM_METRICS_RESPONSE, metrics);
      } catch (error) {
        logger.error('System metrics error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch system metrics' });
      }
    });

    // Handle system alerts
    socket.on(EVENTS.ADMIN.HANDLE_SYSTEM_ALERT, async (data) => {
      try {
        const alert = await MonitoringService.handleAlert({
          alertId: data.alertId,
          action: data.action,
          adminId: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.ALERT_HANDLED, alert);
      } catch (error) {
        logger.error('Alert handling error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to handle system alert' });
      }
    });
  },

  // Configuration Management
  handleConfigurationManagement(socket, io) {
    // Update system configuration
    socket.on(EVENTS.ADMIN.UPDATE_CONFIGURATION, async (data) => {
      try {
        const config = await Configuration.update({
          section: data.section,
          changes: data.changes,
          updatedBy: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.CONFIGURATION_UPDATED, config);

        // Broadcast configuration changes to relevant users
        io.emit(EVENTS.SYSTEM.CONFIGURATION_CHANGED, {
          section: data.section,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Configuration update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update configuration' });
      }
    });
  },

  // Location Management
  handleLocationManagement(socket, io) {
    // Update location settings
    socket.on(EVENTS.ADMIN.UPDATE_LOCATION_SETTINGS, async (data) => {
      try {
        const location = await Location.updateSettings({
          locationId: data.locationId,
          settings: data.settings,
          updatedBy: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.LOCATION_SETTINGS_UPDATED, location);
      } catch (error) {
        logger.error('Location settings update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update location settings' });
      }
    });
  },

  // Content Management
  handleContentManagement(socket, io) {
    // Update system content
    socket.on(EVENTS.ADMIN.UPDATE_CONTENT, async (data) => {
      try {
        const content = await ContentManagement.update({
          type: data.type,
          content: data.content,
          updatedBy: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.CONTENT_UPDATED, content);

        // Broadcast content update to relevant users
        io.emit(EVENTS.SYSTEM.CONTENT_UPDATED, {
          type: data.type,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Content update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update content' });
      }
    });
  },

  // Report Management
  handleReportManagement(socket, io) {
    // Generate system reports
    socket.on(EVENTS.ADMIN.GENERATE_REPORT, async (data) => {
      try {
        const report = await ReportingService.generateSystemReport({
          type: data.type,
          parameters: data.parameters,
          format: data.format
        });

        socket.emit(EVENTS.ADMIN.REPORT_GENERATED, report);
      } catch (error) {
        logger.error('Report generation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to generate report' });
      }
    });
  },

  // System Analytics
  handleSystemAnalytics(socket, io) {
    // Get system analytics
    socket.on(EVENTS.ADMIN.REQUEST_ANALYTICS, async (data) => {
      try {
        const analytics = await AnalyticsService.getSystemAnalytics({
          metrics: data.metrics,
          timeframe: data.timeframe,
          filters: data.filters
        });

        socket.emit(EVENTS.ADMIN.ANALYTICS_RESPONSE, analytics);
      } catch (error) {
        logger.error('Analytics error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch analytics' });
      }
    });
  },

  // Audit Logs
  handleAuditLogs(socket, io) {
    // Get audit logs
    socket.on(EVENTS.ADMIN.REQUEST_AUDIT_LOGS, async (data) => {
      try {
        const logs = await AuditLog.get({
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type,
          userId: data.userId
        });

        socket.emit(EVENTS.ADMIN.AUDIT_LOGS_RESPONSE, logs);
      } catch (error) {
        logger.error('Audit log error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch audit logs' });
      }
    });

    // Add audit log entry
    socket.on(EVENTS.ADMIN.ADD_AUDIT_LOG, async (data) => {
      try {
        const log = await AuditLog.create({
          action: data.action,
          details: data.details,
          adminId: socket.user.id
        });

        socket.emit(EVENTS.ADMIN.AUDIT_LOG_ADDED, log);
      } catch (error) {
        logger.error('Audit log creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to create audit log' });
      }
    });
  }
};

module.exports = adminHandlers;