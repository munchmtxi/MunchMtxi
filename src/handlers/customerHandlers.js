// src/handlers/customerHandlers.js
const logger = require('@utils/logger');
const events = require('@config/events');
const { 
  Customer, 
  Order, 
  Cart, 
  TableBooking, 
  InDiningOrder,
  Review,
  Subscription,
  QuickLink,
  Payment
} = require('@models');
// Assuming PRIORITY_LEVELS is defined in a separate file or module
const { PRIORITY_LEVELS } = require('@config/constants'); // Adjust the path as necessary

const customerHandlers = {
  // Room Management
  async joinRooms(socket) {
    try {
      const customer = await Customer.findOne({ 
        where: { userId: socket.user.id },
        include: ['activeOrders', 'activeBookings'] 
      });
      if (customer) {
        // Join customer-specific room
        socket.join(`customer:${customer.id}`);
        
        // Join active order rooms
        customer.activeOrders.forEach(order => {
          socket.join(`order:${order.id}`);
        });
        // Join active booking rooms
        customer.activeBookings.forEach(booking => {
          socket.join(`booking:${booking.id}`);
        });
        logger.info(`Customer ${customer.id} joined their rooms`);
      }
    } catch (error) {
      logger.error('Error joining customer rooms:', error);
      throw error;
    }
  },
  // Initialize all customer event handlers
  initialize(socket, io) {
    // Profile and Authentication
    this.handleProfileUpdates(socket, io);
    this.handlePaymentMethods(socket, io);
    // Shopping and Orders
    this.handleCartOperations(socket, io);
    this.handleOrderManagement(socket, io);
    this.handleSubscriptions(socket, io);
    // Table Service and Dining
    this.handleTableBooking(socket, io);
    this.handleInDiningOrders(socket, io);
    this.handleQuickLinks(socket, io);
    // Reviews and Feedback
    this.handleReviews(socket, io);
  },

    // Profile Management Handlers
    handleProfileUpdates(socket, io) {
      socket.on(EVENTS.CUSTOMER.PROFILE_UPDATE, async (data) => {
        try {
          const updatedProfile = await Customer.update(socket.user.id, data);
          socket.emit(EVENTS.CUSTOMER.PROFILE_UPDATED, updatedProfile);
          logger.info(`Customer ${socket.user.id} profile updated`);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.CUSTOMER.PROFILE_UPDATED,
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
  
      // Handle payment method management
      socket.on(EVENTS.CUSTOMER.PAYMENT_METHOD_ADD, async (data) => {
        try {
          const newMethod = await Payment.addMethod(socket.user.id, data);
          socket.emit(EVENTS.CUSTOMER.PAYMENT_METHOD_ADDED, newMethod);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.CUSTOMER.PAYMENT_METHOD_ADDED,
            data: newMethod,
            priority: 'LOW'
          });
        } catch (error) {
          logger.error('Payment method addition error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to add payment method' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to add payment method' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Cart Management Handlers
  handleCartOperations(socket, io) {
    // Add item to cart
    socket.on(EVENTS.CART.ADD_ITEM, async (data) => {
      try {
        const updatedCart = await Cart.addItem(socket.user.id, data);
        socket.emit(EVENTS.CART.UPDATED, updatedCart);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.CART.UPDATED,
          data: updatedCart,
          priority: 'LOW'
        });
      } catch (error) {
        logger.error('Cart update error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to update cart' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to update cart' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Order Management Handlers
    handleOrderManagement(socket, io) {
      // Place new order
      socket.on(EVENTS.ORDER.CREATE, async (data) => {
        try {
          const order = await Order.create({
            customerId: socket.user.id,
            ...data
          });
          // Join order room
          socket.join(`order:${order.id}`);
          // Notify merchant
          io.to(`merchant:${data.merchantId}`).emit(EVENTS.ORDER.RECEIVED, order);
          socket.emit(EVENTS.ORDER.CREATED, order);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ORDER.CREATED,
            data: order,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('Order creation error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to create order' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to create order' },
            priority: 'HIGH'
          });
        }
      });
  
      // Track order status
      socket.on(EVENTS.ORDER.TRACK, async (orderId) => {
        try {
          const orderStatus = await Order.getStatus(orderId);
          socket.emit(EVENTS.ORDER.STATUS_UPDATE, orderStatus);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ORDER.STATUS_UPDATE,
            data: orderStatus,
            priority: 'MEDIUM'
          });
        } catch (error) {
          logger.error('Order tracking error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to track order' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to track order' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Table Booking Handlers
  handleTableBooking(socket, io) {
    socket.on(EVENTS.TABLE.BOOK, async (data) => {
      try {
        const booking = await TableBooking.create({
          customerId: socket.user.id,
          merchantId: data.merchantId,
          date: data.date,
          time: data.time,
          guests: data.guests,
          specialRequests: data.specialRequests
        });
        socket.join(`booking:${booking.id}`);
        // Notify merchant
        io.to(`merchant:${data.merchantId}`).emit(EVENTS.TABLE.BOOKING_REQUEST, booking);
        socket.emit(EVENTS.TABLE.BOOKED, booking);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.TABLE.BOOKED,
          data: booking,
          priority: 'HIGH'
        });
      } catch (error) {
        logger.error('Table booking error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to book table' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to book table' },
          priority: 'HIGH'
        });
      }
    });
  },

    // In-Dining Order Handlers
    handleInDiningOrders(socket, io) {
      // Place in-dining order
      socket.on(EVENTS.IN_DINING.ORDER_CREATE, async (data) => {
        try {
          const order = await InDiningOrder.create({
            customerId: socket.user.id,
            bookingId: data.bookingId,
            items: data.items,
            specialRequests: data.specialRequests
          });
          // Notify merchant and staff
          io.to(`merchant:${data.merchantId}`).emit(EVENTS.IN_DINING.ORDER_RECEIVED, order);
          socket.emit(EVENTS.IN_DINING.ORDER_CREATED, order);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.IN_DINING.ORDER_CREATED,
            data: order,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('In-dining order error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to place in-dining order' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to place in-dining order' },
            priority: 'HIGH'
          });
        }
      });
  
      // Handle in-app payments
      socket.on(EVENTS.IN_DINING.PAYMENT_REQUEST, async (data) => {
        try {
          const payment = await Payment.processInDiningPayment({
            orderId: data.orderId,
            amount: data.amount,
            method: data.paymentMethod
          });
          socket.emit(EVENTS.IN_DINING.PAYMENT_COMPLETED, payment);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.IN_DINING.PAYMENT_COMPLETED,
            data: payment,
            priority: 'HIGH'
          });
        } catch (error) {
          logger.error('In-dining payment error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to process payment' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to process payment' },
            priority: 'HIGH'
          });
        }
      });
    },

      // Quick Link Handlers
  handleQuickLinks(socket, io) {
    socket.on(EVENTS.QUICK_LINK.REQUEST, async (data) => {
      try {
        const request = await QuickLink.create({
          customerId: socket.user.id,
          merchantId: data.merchantId,
          type: data.requestType,
          details: data.details,
          priority: data.priority || 'normal'
        });
        // Notify merchant and staff
        io.to(`merchant:${data.merchantId}`).emit(EVENTS.QUICK_LINK.RECEIVED, request);
        // If emergency help, notify admin
        if (data.requestType === 'EMERGENCY_HELP') {
          io.to('role:admin').emit(EVENTS.QUICK_LINK.EMERGENCY, request);
        }
        socket.emit(EVENTS.QUICK_LINK.CONFIRMED, request);
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.QUICK_LINK.CONFIRMED,
          data: request,
          priority: data.priority || 'MEDIUM'
        });
      } catch (error) {
        logger.error('Quick link request error:', error);
        socket.emit(EVENTS.ERROR, { message: 'Failed to process request' });
        
        // Notify with priority
        await this.sendPrioritizedMessage(socket, io, {
          event: EVENTS.ERROR,
          data: { message: 'Failed to process request' },
          priority: 'HIGH'
        });
      }
    });
  },

    // Review Management Handlers
    handleReviews(socket, io) {
      socket.on(EVENTS.REVIEW.CREATE, async (data) => {
        try {
          const review = await Review.create({
            customerId: socket.user.id,
            merchantId: data.merchantId,
            orderId: data.orderId,
            rating: data.rating,
            content: data.content
          });
          // Notify merchant
          io.to(`merchant:${data.merchantId}`).emit(EVENTS.REVIEW.RECEIVED, review);
          socket.emit(EVENTS.REVIEW.CREATED, review);
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.REVIEW.CREATED,
            data: review,
            priority: 'MEDIUM'
          });
        } catch (error) {
          logger.error('Review creation error:', error);
          socket.emit(EVENTS.ERROR, { message: 'Failed to create review' });
          
          // Notify with priority
          await this.sendPrioritizedMessage(socket, io, {
            event: EVENTS.ERROR,
            data: { message: 'Failed to create review' },
            priority: 'HIGH'
          });
        }
      });
    }
  };
  
  module.exports = customerHandlers;