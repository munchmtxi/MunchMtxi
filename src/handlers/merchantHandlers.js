// src/handlers/merchantHandlers.js
const logger = require('@utils/logger');
const events = require('@config/events');
const { 
  Merchant, 
  Order, 
  Inventory,
  Staff,
  Menu,
  TableBooking,
  Payment,
  Report,
  Analytics,
  Promotion
} = require('@models');
const NotificationService = require('../services/notificationService');
const AnalyticsService = require('../services/analyticsService');
const ReportingService = require('../services/reportingService');

const merchantHandlers = {
  // Room Management
  async joinRooms(socket) {
    try {
      const merchant = await Merchant.findOne({ 
        where: { userId: socket.user.id },
        include: ['activeOrders', 'activeBookings', 'staff'] 
      });

      if (merchant) {
        // Join merchant-specific room
        socket.join(`merchant:${merchant.id}`);
        
        // Join business type room
        socket.join(`businessType:${merchant.businessType}`);
        
        // Join active order rooms
        merchant.activeOrders?.forEach(order => {
          socket.join(`order:${order.id}`);
        });

        // Join booking rooms for restaurants
        if (merchant.businessType === 'RESTAURANT') {
          merchant.activeBookings?.forEach(booking => {
            socket.join(`booking:${booking.id}`);
          });
        }

        logger.info(`Merchant ${merchant.id} joined their rooms`);
      }
    } catch (error) {
      logger.error('Error joining merchant rooms:', error);
      throw error;
    }
  },

  // Initialize all merchant event handlers
  initialize(socket, io) {
    // Profile and Business Management
    this.handleProfileUpdates(socket, io);
    this.handleBusinessSettings(socket, io);
    
    // Product and Inventory Management
    this.handleInventoryManagement(socket, io);
    this.handleMenuManagement(socket, io);
    
    // Order and Booking Management
    this.handleOrderManagement(socket, io);
    this.handleTableManagement(socket, io);
    
    // Staff Management
    this.handleStaffManagement(socket, io);
    this.handleStaffPermissions(socket, io);
    
    // Financial Management
    this.handleFinancialOperations(socket, io);
    this.handlePaymentProcessing(socket, io);
    
    // Analytics and Reporting
    this.handleAnalytics(socket, io);
    this.handleReporting(socket, io);

    // Marketing and Promotions
    this.handlePromotions(socket, io);
    this.handleContentManagement(socket, io);
  },

  // Profile Management
  handleProfileUpdates(socket, io) {
    socket.on(EVENTS.MERCHANT.PROFILE_UPDATE, async (data) => {
      try {
        const updatedProfile = await Merchant.update(socket.user.id, {
          businessName: data.businessName,
          address: data.address,
          phoneNumber: data.phoneNumber,
          businessHours: data.businessHours,
          serviceArea: data.serviceArea
        });

        socket.emit(EVENTS.MERCHANT.PROFILE_UPDATED, updatedProfile);
        logger.info(`Merchant ${socket.user.id} profile updated`);
      } catch (error) {
        logger.error('Profile update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update profile' });
      }
    });
  },

  // Business Settings Management
  handleBusinessSettings(socket, io) {
    socket.on(EVENTS.MERCHANT.UPDATE_SETTINGS, async (data) => {
      try {
        const merchant = await Merchant.findByPk(socket.user.id);
        const settings = await merchant.updateSettings({
          currency: data.currency,
          timeZone: data.timeZone,
          deliverySettings: data.deliverySettings,
          taxSettings: data.taxSettings,
          orderingPreferences: data.orderingPreferences
        });

        // For restaurants, handle additional settings
        if (merchant.businessType === 'RESTAURANT') {
          await merchant.updateRestaurantSettings({
            tableLayout: data.tableLayout,
            reservationSettings: data.reservationSettings,
            quickLinkOptions: data.quickLinkOptions
          });
        }

        socket.emit(EVENTS.MERCHANT.SETTINGS_UPDATED, settings);
      } catch (error) {
        logger.error('Settings update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update settings' });
      }
    });
  },

  // Inventory Management
  handleInventoryManagement(socket, io) {
    // Update inventory levels
    socket.on(EVENTS.INVENTORY.UPDATE, async (data) => {
      try {
        const updates = await Inventory.bulkUpdate(data.updates);
        
        // Check for low stock alerts
        const lowStockItems = updates.filter(item => item.quantity <= item.threshold);
        if (lowStockItems.length > 0) {
          await NotificationService.send(socket.user.id, 'MERCHANT', 'LOW_STOCK_ALERT', {
            items: lowStockItems,
            urgency: this.calculateUrgency(lowStockItems)
          });
        }

        socket.emit(EVENTS.INVENTORY.UPDATED, updates);

        // Notify staff of inventory changes
        io.to(`merchant:${socket.user.id}`).emit(EVENTS.INVENTORY.STAFF_UPDATE, {
          updates: updates.map(item => ({
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            status: item.quantity <= item.threshold ? 'LOW_STOCK' : 'NORMAL'
          }))
        });
      } catch (error) {
        logger.error('Inventory update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update inventory' });
      }
    });
  },

  // Menu Management
  handleMenuManagement(socket, io) {
    // Create or update menu items
    socket.on(EVENTS.MENU.UPDATE_ITEMS, async (data) => {
      try {
        const merchant = await Merchant.findByPk(socket.user.id);
        const menu = await Menu.bulkUpdate({
          merchantId: merchant.id,
          items: data.items,
          categories: data.categories,
          modifiers: data.modifiers
        });

        socket.emit(EVENTS.MENU.UPDATED, menu);

        // If restaurant, notify staff of menu changes
        if (merchant.businessType === 'RESTAURANT') {
          io.to(`merchant:${merchant.id}`).emit(EVENTS.MENU.STAFF_UPDATE, {
            updatedItems: data.items
          });
        }
      } catch (error) {
        logger.error('Menu update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update menu' });
      }
    });
  },

  // Order Management
  handleOrderManagement(socket, io) {
    // Handle new order
    socket.on(EVENTS.ORDER.RECEIVED, async (data) => {
      try {
        const order = await Order.create({
          merchantId: socket.user.id,
          ...data
        });

        // Join order room
        socket.join(`order:${order.id}`);

        // Assign to available staff
        const assignedStaff = await Staff.assignOrder(order.id);
        if (assignedStaff) {
          io.to(`staff:${assignedStaff.id}`).emit(EVENTS.ORDER.ASSIGNED, {
            orderId: order.id,
            orderDetails: order
          });
        }

        // Notify customer
        io.to(`customer:${order.customerId}`).emit(EVENTS.ORDER.CONFIRMED, {
          orderId: order.id,
          status: order.status,
          estimatedTime: order.estimatedTime
        });

        socket.emit(EVENTS.ORDER.CREATED, order);
      } catch (error) {
        logger.error('Order creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process order' });
      }
    });

    // Update order status
    socket.on(EVENTS.ORDER.UPDATE_STATUS, async (data) => {
      try {
        const order = await Order.updateStatus(data.orderId, data.status);

        io.to(`order:${data.orderId}`).emit(EVENTS.ORDER.STATUS_UPDATED, {
          orderId: data.orderId,
          status: data.status,
          updatedAt: new Date()
        });

        // If order completed, update analytics
        if (data.status === 'COMPLETED') {
          await AnalyticsService.recordOrderCompletion(order);
        }
      } catch (error) {
        logger.error('Order status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update order status' });
      }
    });
  },

  // Table Management (Restaurant-specific)
  handleTableManagement(socket, io) {
    // Handle table booking
    socket.on(EVENTS.TABLE.BOOKING_REQUEST, async (data) => {
      try {
        const booking = await TableBooking.create({
          merchantId: socket.user.id,
          ...data
        });

        socket.join(`booking:${booking.id}`);

        // Notify customer
        io.to(`customer:${booking.customerId}`).emit(EVENTS.TABLE.BOOKING_CONFIRMED, {
          bookingId: booking.id,
          bookingDetails: booking
        });

        // Notify staff
        io.to(`merchant:${socket.user.id}`).emit(EVENTS.TABLE.NEW_BOOKING, {
          bookingId: booking.id,
          bookingDetails: booking
        });

        socket.emit(EVENTS.TABLE.BOOKING_CREATED, booking);
      } catch (error) {
        logger.error('Booking creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process booking' });
      }
    });

    // Handle quick link requests
    socket.on(EVENTS.QUICK_LINK.RECEIVED, async (data) => {
      try {
        const request = await QuickLink.process({
          merchantId: socket.user.id,
          ...data
        });

        // Assign staff for the request
        const assignedStaff = await Staff.assignQuickLink(request.id);
        if (assignedStaff) {
          io.to(`staff:${assignedStaff.id}`).emit(EVENTS.QUICK_LINK.ASSIGNED, {
            requestId: request.id,
            requestDetails: request
          });
        }

        // Notify customer
        io.to(`customer:${request.customerId}`).emit(EVENTS.QUICK_LINK.CONFIRMED, {
          requestId: request.id,
          status: 'RECEIVED'
        });
      } catch (error) {
        logger.error('Quick link processing error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process quick link request' });
      }
    });
  },

  // Staff Management
  handleStaffManagement(socket, io) {
    // Add new staff
    socket.on(EVENTS.STAFF.ADD, async (data) => {
      try {
        const newStaff = await Staff.create({
          merchantId: socket.user.id,
          ...data
        });

        socket.emit(EVENTS.STAFF.ADDED, newStaff);

        // Notify other staff members
        io.to(`merchant:${socket.user.id}`).emit(EVENTS.STAFF.NEW_MEMBER, {
          staffId: newStaff.id,
          name: newStaff.name,
          role: newStaff.role
        });
      } catch (error) {
        logger.error('Staff addition error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to add staff member' });
      }
    });

    // Update staff permissions
    socket.on(EVENTS.STAFF.UPDATE_PERMISSIONS, async (data) => {
      try {
        const updatedPermissions = await Staff.updatePermissions({
          staffId: data.staffId,
          permissions: data.permissions,
          updatedBy: socket.user.id
        });

        // Notify affected staff member
        io.to(`staff:${data.staffId}`).emit(EVENTS.STAFF.PERMISSIONS_UPDATED, {
          permissions: updatedPermissions
        });

        socket.emit(EVENTS.STAFF.PERMISSIONS_UPDATED, {
          staffId: data.staffId,
          permissions: updatedPermissions
        });
      } catch (error) {
        logger.error('Permission update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update permissions' });
      }
    });
  },

  // Financial Operations
  handleFinancialOperations(socket, io) {
    // Process refund
    socket.on(EVENTS.PAYMENT.REFUND_REQUEST, async (data) => {
      try {
        const refund = await Payment.processRefund({
          orderId: data.orderId,
          amount: data.amount,
          reason: data.reason,
          processedBy: socket.user.id
        });

        // Notify customer
        io.to(`customer:${data.customerId}`).emit(EVENTS.PAYMENT.REFUND_PROCESSED, {
          orderId: data.orderId,
          refundAmount: data.amount
        });

        socket.emit(EVENTS.PAYMENT.REFUND_COMPLETED, refund);
      } catch (error) {
        logger.error('Refund processing error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process refund' });
      }
    });

    // Generate financial report
    socket.on(EVENTS.FINANCE.REPORT_REQUEST, async (data) => {
      try {
        const report = await ReportingService.generateFinancialReport({
          merchantId: socket.user.id,
          startDate: data.startDate,
          endDate: data.endDate,
          reportType: data.reportType
        });

        socket.emit(EVENTS.FINANCE.REPORT_READY, {
          reportId: report.id,
          downloadUrl: report.downloadUrl
        });
      } catch (error) {
        logger.error('Financial report generation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to generate report' });
      }
    });
  },

  // Analytics and Reporting
  handleAnalytics(socket, io) {
    socket.on(EVENTS.ANALYTICS.REQUEST, async (data) => {
      try {
        const analytics = await AnalyticsService.generateMerchantAnalytics({
          merchantId: socket.user.id,
          timeframe: data.timeframe,
          metrics: data.metrics
        });

        socket.emit(EVENTS.ANALYTICS.RESPONSE, analytics);
      } catch (error) {
        logger.error('Analytics generation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to generate analytics' });
      }
    });
  },

  // Marketing and Promotions
  handlePromotions(socket, io) {
    // Create new promotion
    socket.on(EVENTS.PROMOTION.CREATE, async (data) => {
      try {
        const promotion = await Promotion.create({
          merchantId: socket.user.id,
          name: data.name,
          description: data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          startDate: data.startDate,
          endDate: data.endDate,
          applicableItems: data.applicableItems,
          minimumPurchase: data.minimumPurchase,
          maxUses: data.maxUses,
          conditions: data.conditions
        });

        // Notify customers if promotion is active
        if (new Date(promotion.startDate) <= new Date()) {
          await NotificationService.notifyCustomers('NEW_PROMOTION', {
            merchantId: socket.user.id,
            promotion: promotion
          });
        }

        socket.emit(EVENTS.PROMOTION.CREATED, promotion);
      } catch (error) {
        logger.error('Promotion creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to create promotion' });
      }
    });

    // Update existing promotion
    socket.on(EVENTS.PROMOTION.UPDATE, async (data) => {
      try {
        const updatedPromotion = await Promotion.update(data.promotionId, {
          name: data.name,
          description: data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          startDate: data.startDate,
          endDate: data.endDate,
          applicableItems: data.applicableItems,
          minimumPurchase: data.minimumPurchase,
          maxUses: data.maxUses,
          conditions: data.conditions,
          status: data.status
        });

        socket.emit(EVENTS.PROMOTION.UPDATED, updatedPromotion);

        // Notify staff of promotion changes
        io.to(`merchant:${socket.user.id}`).emit(EVENTS.PROMOTION.STAFF_UPDATE, {
          promotion: updatedPromotion
        });
      } catch (error) {
        logger.error('Promotion update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update promotion' });
      }
    });

    // Delete promotion
    socket.on(EVENTS.PROMOTION.DELETE, async (data) => {
      try {
        await Promotion.delete(data.promotionId);
        
        socket.emit(EVENTS.PROMOTION.DELETED, { promotionId: data.promotionId });
        
        // Notify staff of promotion deletion
        io.to(`merchant:${socket.user.id}`).emit(EVENTS.PROMOTION.REMOVED, {
          promotionId: data.promotionId
        });
      } catch (error) {
        logger.error('Promotion deletion error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to delete promotion' });
      }
    });

    // Get promotion analytics
    socket.on(EVENTS.PROMOTION.GET_ANALYTICS, async (data) => {
      try {
        const analytics = await AnalyticsService.getPromotionMetrics(data.promotionId, {
          startDate: data.startDate,
          endDate: data.endDate
        });

        socket.emit(EVENTS.PROMOTION.ANALYTICS_RESPONSE, analytics);
      } catch (error) {
        logger.error('Promotion analytics error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to fetch promotion analytics' });
      }
    });
  },

  // Content Management
  handleContentManagement(socket, io) {
    // Update merchant content
    socket.on(EVENTS.CONTENT.UPDATE, async (data) => {
      try {
        const updatedContent = await Merchant.updateContent(socket.user.id, {
          storefront: data.storefront,
          banners: data.banners,
          featured: data.featured,
          announcements: data.announcements
        });

        socket.emit(EVENTS.CONTENT.UPDATED, updatedContent);
      } catch (error) {
        logger.error('Content update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update content' });
      }
    });

    // Manage media assets
    socket.on(EVENTS.MEDIA.UPLOAD, async (data) => {
      try {
        const media = await Merchant.uploadMedia(socket.user.id, {
          type: data.type,
          file: data.file,
          metadata: data.metadata
        });

        socket.emit(EVENTS.MEDIA.UPLOADED, media);
      } catch (error) {
        logger.error('Media upload error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to upload media' });
      }
    });

    // Delete media
    socket.on(EVENTS.MEDIA.DELETE, async (data) => {
      try {
        await Merchant.deleteMedia(socket.user.id, data.mediaId);
        socket.emit(EVENTS.MEDIA.DELETED, { mediaId: data.mediaId });
      } catch (error) {
        logger.error('Media deletion error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to delete media' });
      }
    });
  },

  // Payment Processing
  handlePaymentProcessing(socket, io) {
    // Process payment
    socket.on(EVENTS.PAYMENT.PROCESS, async (data) => {
      try {
        const payment = await Payment.process({
          merchantId: socket.user.id,
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          currency: data.currency
        });

        socket.emit(EVENTS.PAYMENT.PROCESSED, payment);

        // Notify customer
        io.to(`customer:${data.customerId}`).emit(EVENTS.PAYMENT.CONFIRMED, {
          orderId: data.orderId,
          amount: data.amount,
          status: payment.status
        });
      } catch (error) {
        logger.error('Payment processing error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process payment' });
      }
    });

    // Handle payment status updates
    socket.on(EVENTS.PAYMENT.STATUS_UPDATE, async (data) => {
      try {
        const payment = await Payment.updateStatus(data.paymentId, data.status);

        socket.emit(EVENTS.PAYMENT.STATUS_UPDATED, payment);
      } catch (error) {
        logger.error('Payment status update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update payment status' });
      }
    });
  },

  // Reporting
  handleReporting(socket, io) {
    // Generate reports
    socket.on(EVENTS.REPORT.GENERATE, async (data) => {
      try {
        const report = await ReportingService.generate({
          merchantId: socket.user.id,
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          filters: data.filters,
          format: data.format
        });

        socket.emit(EVENTS.REPORT.GENERATED, report);
      } catch (error) {
        logger.error('Report generation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to generate report' });
      }
    });

    // Schedule recurring reports
    socket.on(EVENTS.REPORT.SCHEDULE, async (data) => {
      try {
        const schedule = await ReportingService.scheduleReport({
          merchantId: socket.user.id,
          type: data.type,
          frequency: data.frequency,
          recipients: data.recipients,
          format: data.format
        });

        socket.emit(EVENTS.REPORT.SCHEDULED, schedule);
      } catch (error) {
        logger.error('Report scheduling error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to schedule report' });
      }
    });
  }
};

module.exports = merchantHandlers;