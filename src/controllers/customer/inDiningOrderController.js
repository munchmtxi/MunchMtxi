'use strict';
const catchAsync = require('@utils/catchAsync');
const InDiningOrderService = require('@services/customer/inDiningOrderService');
const { logger, PerformanceMonitor } = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = (io) => {
  const inDiningOrderService = new InDiningOrderService(io);

  return {
    addItem: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const { items } = req.body;
      const customerId = req.user.id;

      if (!items || !Array.isArray(items)) {
        throw new AppError('Items must be provided as an array', 400);
      }

      const result = await inDiningOrderService.addItem(orderId, customerId, items);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/items`, 'POST', duration, 201, customerId);
      logger.logApiEvent('Item added to in-dining order', { orderId, customerId, duration });

      res.status(201).json({ status: 'success', message: 'Items added successfully', data: result });
    }),

    updateOrder: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const updates = req.body;
      const customerId = req.user.id;

      const order = await inDiningOrderService.updateOrder(orderId, customerId, updates);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}`, 'PATCH', duration, 200, customerId);
      logger.logApiEvent('In-dining order updated', { orderId, customerId, duration });

      res.status(200).json({ status: 'success', message: 'Order updated successfully', data: order });
    }),

    closeOrder: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const customerId = req.user.id;

      const order = await inDiningOrderService.closeOrder(orderId, customerId);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/close`, 'POST', duration, 200, customerId);
      logger.logApiEvent('In-dining order closed', { orderId, customerId, duration });

      res.status(200).json({ status: 'success', message: 'Order closed successfully', data: order });
    }),

    getOrderStatus: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const customerId = req.user.id;

      const status = await inDiningOrderService.getOrderStatus(orderId, customerId);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/status`, 'GET', duration, 200, customerId);
      logger.logApiEvent('In-dining order status retrieved', { orderId, customerId, duration });

      res.status(200).json({ status: 'success', message: 'Order status retrieved successfully', data: status });
    }),

    payOrder: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const paymentData = req.body;
      const customerId = req.user.id;

      const payment = await inDiningOrderService.payOrder(orderId, customerId, paymentData);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/pay`, 'POST', duration, 200, customerId);
      logger.logApiEvent('In-dining order paid', { orderId, customerId, duration });

      res.status(200).json({ status: 'success', message: 'Order paid successfully', data: payment });
    }),

    getRecommendations: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { branchId } = req.query;
      const customerId = req.user.id;

      if (!branchId) {
        throw new AppError('Branch ID is required', 400);
      }

      const recommendations = await inDiningOrderService.getRecommendations(customerId, branchId);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest('/api/orders/recommendations', 'GET', duration, 200, customerId);
      logger.logApiEvent('Recommendations retrieved', { customerId, branchId, duration });

      res.status(200).json({
        status: 'success',
        message: 'Recommendations retrieved successfully',
        data: recommendations,
      });
    }),

    addTip: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const { amount, allocation } = req.body;
      const customerId = req.user.id;

      if (!amount || amount <= 0) {
        throw new AppError('Tip amount must be a positive number', 400);
      }

      const payment = await inDiningOrderService.addTip(orderId, customerId, { amount, allocation });

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/tip`, 'POST', duration, 200, customerId);
      logger.logApiEvent('Tip added to in-dining order', { orderId, customerId, tipAmount: amount, duration });

      res.status(200).json({ status: 'success', message: 'Tip added successfully', data: payment });
    }),

    getActiveBookingSession: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const customerId = req.user.id;

      const session = await inDiningOrderService.getActiveBookingSession(orderId, customerId);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/session`, 'GET', duration, 200, customerId);
      logger.logApiEvent('Active booking session retrieved', { orderId, customerId, duration });

      res.status(200).json({
        status: 'success',
        message: 'Active booking session retrieved successfully',
        data: session,
      });
    }),

    addFriend: catchAsync(async (req, res) => {
      const startTime = Date.now();
      const { orderId } = req.params;
      const { friendUserId } = req.body;
      const customerId = req.user.id;

      if (!friendUserId) {
        throw new AppError('Friend user ID is required', 400);
      }

      const connection = await inDiningOrderService.addFriend(orderId, customerId, friendUserId);

      const duration = Date.now() - startTime;
      PerformanceMonitor.trackRequest(`/api/orders/${orderId}/friend`, 'POST', duration, 201, customerId);
      logger.logApiEvent('Friend added from in-dining session', { orderId, customerId, friendUserId, duration });

      res.status(201).json({
        status: 'success',
        message: 'Friend added successfully',
        data: connection,
      });
    }),
  };
};