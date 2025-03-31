'use strict';
const express = require('express');
const router = express.Router();
const inDiningOrderController = require('@controllers/customer/inDiningOrderController');
const {
  validateOrderAccess,
  validateBranchAccess,
  validateTipData,
  validateFriendRequest,
} = require('@middleware/customer/inDiningOrderMiddleware');
const { protect, restrictTo } = require('@middleware/authMiddleware');

module.exports = (io) => {
  const controller = inDiningOrderController(io);

  router.use(protect);
  router.use(restrictTo('customer'));

  router.post('/:orderId/items', validateOrderAccess, controller.addItem);
  router.patch('/:orderId', validateOrderAccess, controller.updateOrder);
  router.post('/:orderId/close', validateOrderAccess, controller.closeOrder);
  router.get('/:orderId/status', validateOrderAccess, controller.getOrderStatus);
  router.post('/:orderId/pay', validateOrderAccess, controller.payOrder);
  router.get('/recommendations', validateBranchAccess, controller.getRecommendations);
  router.post('/:orderId/tip', validateOrderAccess, validateTipData, controller.addTip);
  router.get('/:orderId/session', validateOrderAccess, controller.getActiveBookingSession);
  router.post('/:orderId/friend', validateOrderAccess, validateFriendRequest, controller.addFriend);

  return router;
};