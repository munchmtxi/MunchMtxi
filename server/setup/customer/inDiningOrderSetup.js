'use strict';
const { logger } = require('@utils/logger');

module.exports = function setupInDiningOrder(app, io) {
  logger.debug('Initializing inDiningOrderSetup');
  
  // Defer service import until function execution to avoid circular dependency
  const InDiningOrderService = require('@services/customer/inDiningOrderService');
  const inDiningOrderRoutes = require('@routes/customer/inDiningOrderRoutes');
  
  const inDiningOrderService = new InDiningOrderService(io);
  inDiningOrderService.setupInDiningOrder();
  app.use('/api/v1/in-dining-orders', inDiningOrderRoutes(io));
  
  logger.info('In-dining order routes and Socket.IO initialized');
};