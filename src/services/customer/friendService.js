'use strict';
const { User, UserConnections, Notification } = require('@models');
const { Op } = require('sequelize');
const NotificationService = require('@services/notifications/core/notificationService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class FriendService {
  constructor(io) {
    this.notificationService = new NotificationService(io);
  }

  async sendFriendRequest(userId, friendId) {
    if (userId === friendId) throw new AppError('Cannot add yourself as a friend', 400);

    const existing = await UserConnections.findOne({
      where: {
        [Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });
    if (existing) throw new AppError('Friend request already exists', 400);

    return await UserConnections.sequelize.transaction(async (t) => {
      const connection = await UserConnections.create(
        { user_id: userId, friend_id: friendId, status: 'pending' },
        { transaction: t }
      );

      const friend = await User.findByPk(friendId, { transaction: t });
      await this.sendNotification(friendId, `${(await User.findByPk(userId, { transaction: t })).getFullName()} sent you a friend request`, t);
      logger.info('Friend request sent', { userId, friendId });
      return connection;
    });
  }

  async acceptFriendRequest(userId, requestId) {
    return await UserConnections.sequelize.transaction(async (t) => {
      const connection = await UserConnections.findByPk(requestId, { transaction: t });
      if (!connection) throw new AppError('Friend request not found', 404);
      if (connection.friend_id !== userId) throw new AppError('Unauthorized', 403);
      if (connection.status !== 'pending') throw new AppError('Request already processed', 400);

      await connection.update({ status: 'accepted', accepted_at: new Date() }, { transaction: t });
      await this.sendNotification(
        connection.user_id,
        `${(await User.findByPk(userId, { transaction: t })).getFullName()} accepted your friend request`,
        t
      );
      logger.info('Friend request accepted', { userId, requestId });
      return connection;
    });
  }

  async rejectFriendRequest(userId, requestId) {
    return await UserConnections.sequelize.transaction(async (t) => {
      const connection = await UserConnections.findByPk(requestId, { transaction: t });
      if (!connection) throw new AppError('Friend request not found', 404);
      if (connection.friend_id !== userId) throw new AppError('Unauthorized', 403);
      if (connection.status !== 'pending') throw new AppError('Request already processed', 400);

      await connection.update({ status: 'rejected' }, { transaction: t });
      logger.info('Friend request rejected', { userId, requestId });
      return connection;
    });
  }

  async getFriends(userId) {
    const connections = await UserConnections.findAll({
      where: {
        [Op.or]: [{ user_id: userId }, { friend_id: userId }],
        status: 'accepted',
      },
      include: [
        { model: User, as: 'user' },
        { model: User, as: 'friend' },
      ],
    });

    return connections.map((c) => ({
      userId: c.user_id === userId ? c.friend_id : c.user_id,
      fullName: c.user_id === userId ? c.friend.getFullName() : c.user.getFullName(),
      status: c.status,
      connectedSince: c.accepted_at,
    }));
  }

  async sendNotification(userId, message, transaction = null) {
    const notification = await Notification.create(
      {
        user_id: userId,
        type: 'FRIEND_REQUEST',
        message,
        priority: 'MEDIUM',
      },
      { transaction }
    );

    const user = await User.findByPk(userId, {
      include: [{ model: Customer, as: 'customer_profile' }],
      transaction,
    });
    if (user.customer_profile) {
      await this.notificationService.sendThroughChannel(
        'WHATSAPP',
        {
          notification: { templateName: 'friend_request', parameters: { message } },
          content: message,
          recipient: user.customer_profile.format_phone_for_whatsapp(),
        },
        transaction
      );
    } else {
      logger.warn('No customer profile for WhatsApp notification, falling back to email', { userId });
      await this.notificationService.sendThroughChannel(
        'EMAIL',
        {
          notification: { templateName: 'friend_request', parameters: { message } },
          content: message,
          recipient: user.email,
        },
        transaction
      );
    }
  }
}

module.exports = FriendService;