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
// Assuming PRIORITY_LEVELS is defined in a separate file or module
const { PRIORITY_LEVELS } = require('@config/constants'); // Adjust the path as necessary

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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.MERCHANT.PROFILE_UPDATED,
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.MERCHANT.SETTINGS_UPDATED,
          data: settings,
          priority: 'MEDIUM'
        });
      } catch (error) {
        logger.error('Settings update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update settings' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update settings' },
          priority: 'HIGH'
        });
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.INVENTORY.UPDATED,
            data: updates,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Inventory update error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to update inventory' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to update inventory' },
            priority: 'HIGH'
          });
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.MENU.UPDATED,
          data: menu,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Menu update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update menu' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update menu' },
          priority: 'HIGH'
        });
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
            data
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ORDER.CREATED,
            data: order,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Order creation error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to process order' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to process order' },
            priority: 'HIGH'
          });
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ORDER.STATUS_UPDATED,
            data: {
              orderId: data.orderId,
              status: data.status,
              updatedAt: new Date()
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
    },

      // Table Management (Restaurant-specific)
  handleTableManagement(socket, io) {
    // Handle table booking
    socket.on(EVENTS.TABLE.BOOKING_REQUEST, async (data) => {
      try {
        const booking = await TableBooking.create({
          merchantId: socket.user.id,
          data
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TABLE.BOOKING_CREATED,
          data: booking,
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Booking creation error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process booking' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to process booking' },
          priority: 'HIGH'
        });
      }
    });

    // Handle quick link requests
    socket.on(EVENTS.QUICK_LINK.RECEIVED, async (data) => {
      try {
        const request = await QuickLink.process({
          merchantId: socket.user.id,
          data
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
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.QUICK_LINK.CONFIRMED,
          data: {
            requestId: request.id,
            status: 'RECEIVED'
          },
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Quick link processing error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process quick link request' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to process quick link request' },
          priority: 'HIGH'
        });
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
            data
          });
          socket.emit(EVENTS.STAFF.ADDED, newStaff);
          // Notify other staff members
          io.to(`merchant:${socket.user.id}`).emit(EVENTS.STAFF.NEW_MEMBER, {
            staffId: newStaff.id,
            name: newStaff.name,
            role: newStaff.role
          });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.STAFF.ADDED,
            data: newStaff,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Staff addition error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to add staff member' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to add staff member' },
            priority: 'HIGH'
          });
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
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.STAFF.PERMISSIONS_UPDATED,
            data: {
              staffId: data.staffId,
              permissions: updatedPermissions
            },
            priority: 'HIGH'
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
    }
  };
  
  module.exports = merchantHandlers;