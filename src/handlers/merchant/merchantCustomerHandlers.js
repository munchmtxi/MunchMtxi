'use strict';

const { logger } = require('@utils/logger');
const MerchantCustomerOperationsService = require('@services/merchant/merchantCustomerOperationsService');
const MERCHANT_CUSTOMER_EVENTS = require('@config/events/merchant/merchantCustomerEvents');

module.exports = (io, socket) => {
  const service = new MerchantCustomerOperationsService(io);
  const merchantId = socket.user?.merchantId;

  logger.info('Setting up merchant customer socket handlers', { socketId: socket.id, merchantId });

  socket.on(MERCHANT_CUSTOMER_EVENTS.MERCHANT.BOOKING_ASSIGNED, async ({ bookingId, staffId }) => {
    try {
      const token = socket.handshake.auth.token;
      await service.assignStaffToBooking(merchantId, bookingId, staffId, token);
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.SUCCESS, { message: 'Staff assigned to booking', bookingId, staffId });
    } catch (error) {
      logger.error('Error in booking assignment handler', { error: error.message, socketId: socket.id });
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ERROR, { message: error.message, code: 'BOOKING_ASSIGNMENT_ERROR' });
    }
  });

  socket.on(MERCHANT_CUSTOMER_EVENTS.MERCHANT.TABLE_STAFF_UPDATE, async ({ tableId, staffId }) => {
    try {
      const token = socket.handshake.auth.token;
      await service.assignStaffToTable(merchantId, tableId, staffId, token);
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.SUCCESS, { message: 'Staff assigned to table', tableId, staffId });
    } catch (error) {
      logger.error('Error in table staff update handler', { error: error.message, socketId: socket.id });
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ERROR, { message: error.message, code: 'TABLE_STAFF_UPDATE_ERROR' });
    }
  });

  socket.on(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ORDER_UPDATED, async ({ orderId, data }) => {
    try {
      const token = socket.handshake.auth.token;
      await service.manageInDiningOrder(merchantId, orderId, data, token);
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.SUCCESS, { message: 'In-dining order updated', orderId });
    } catch (error) {
      logger.error('Error in order update handler', { error: error.message, socketId: socket.id });
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ERROR, { message: error.message, code: 'ORDER_UPDATE_ERROR' });
    }
  });

  socket.on(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ORDER_READY, async ({ orderId, driverId }) => {
    try {
      const token = socket.handshake.auth.token;
      await service.manageTakeawayOrder(merchantId, orderId, { markReady: true, driverId }, token);
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.SUCCESS, { message: 'Takeaway order marked ready', orderId });
    } catch (error) {
      logger.error('Error in order ready handler', { error: error.message, socketId: socket.id });
      socket.emit(MERCHANT_CUSTOMER_EVENTS.MERCHANT.ERROR, { message: error.message, code: 'ORDER_READY_ERROR' });
    }
  });
};