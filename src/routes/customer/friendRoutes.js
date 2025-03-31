'use strict';
const express = require('express');
const router = express.Router();
const friendController = require('@controllers/customer/friendController');
const { validateFriendId, validateRequestId } = require('@middleware/customer/friendMiddleware');
const { protect } = require('@middleware/authMiddleware');

module.exports = (io) => {
  const controller = friendController(io);

  router.use(protect);

  router.post('/request', validateFriendId, controller.sendFriendRequest);
  router.patch('/request/:requestId/accept', validateRequestId, controller.acceptFriendRequest);
  router.patch('/request/:requestId/reject', validateRequestId, controller.rejectFriendRequest);
  router.get('/', controller.getFriends);

  return router;
};