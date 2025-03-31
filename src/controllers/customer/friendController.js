'use strict';

const FriendService = require('@services/customer/friendService');
let catchAsync;
try {
  catchAsync = require('@utils/catchAsync');
} catch (e) {
  console.error('Failed to load catchAsync:', e);
  catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // Fallback
}
const { logger, PerformanceMonitor } = require('@utils/logger');
const AppError = require('@utils/AppError');

logger.debug('Imported catchAsync in FriendController:', catchAsync);
if (typeof catchAsync !== 'function') {
  logger.error('catchAsync is not a function in FriendController:', catchAsync);
  throw new Error('catchAsync is not a function');
}

class FriendController {
  constructor(io) {
    this.friendService = new FriendService(io);
  }

  sendFriendRequest = catchAsync(async (req, res) => {
    const startTime = Date.now();
    const { userId } = req.user;
    const { friendId } = req.body;

    if (!friendId) {
      throw new AppError('Friend ID is required', 400);
    }

    const connection = await this.friendService.sendFriendRequest(userId, friendId);

    const duration = Date.now() - startTime;
    PerformanceMonitor.trackRequest('/api/friends/request', 'POST', duration, 201, userId);
    logger.logApiEvent('Friend request sent', { userId, friendId, duration });

    res.status(201).json({
      status: 'success',
      message: 'Friend request sent successfully',
      data: {
        connection: {
          id: connection.id,
          userId: connection.user_id,
          friendId: connection.friend_id,
          status: connection.status,
          requestedAt: connection.requested_at,
        },
      },
    });
  });

  acceptFriendRequest = catchAsync(async (req, res) => {
    const startTime = Date.now();
    const { userId } = req.user;
    const { requestId } = req.params;

    const connection = await this.friendService.acceptFriendRequest(userId, requestId);

    const duration = Date.now() - startTime;
    PerformanceMonitor.trackRequest(`/api/friends/request/${requestId}/accept`, 'PATCH', duration, 200, userId);
    logger.logApiEvent('Friend request accepted', { userId, requestId, duration });

    res.status(200).json({
      status: 'success',
      message: 'Friend request accepted successfully',
      data: {
        connection: {
          id: connection.id,
          userId: connection.user_id,
          friendId: connection.friend_id,
          status: connection.status,
          acceptedAt: connection.accepted_at,
        },
      },
    });
  });

  rejectFriendRequest = catchAsync(async (req, res) => {
    const startTime = Date.now();
    const { userId } = req.user;
    const { requestId } = req.params;

    const connection = await this.friendService.rejectFriendRequest(userId, requestId);

    const duration = Date.now() - startTime;
    PerformanceMonitor.trackRequest(`/api/friends/request/${requestId}/reject`, 'PATCH', duration, 200, userId);
    logger.logApiEvent('Friend request rejected', { userId, requestId, duration });

    res.status(200).json({
      status: 'success',
      message: 'Friend request rejected successfully',
      data: {
        connection: {
          id: connection.id,
          userId: connection.user_id,
          friendId: connection.friend_id,
          status: connection.status,
        },
      },
    });
  });

  getFriends = catchAsync(async (req, res) => {
    const startTime = Date.now();
    const { userId } = req.user;

    const friends = await this.friendService.getFriends(userId);

    const duration = Date.now() - startTime;
    PerformanceMonitor.trackRequest('/api/friends', 'GET', duration, 200, userId);
    logger.logApiEvent('Friends list retrieved', { userId, friendCount: friends.length, duration });

    res.status(200).json({
      status: 'success',
      message: 'Friends list retrieved successfully',
      data: {
        friends,
        total: friends.length,
      },
    });
  });
}

module.exports = (io) => new FriendController(io);