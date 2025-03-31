'use strict';
const { UserConnections } = require('@models');
const AppError = require('@utils/AppError');

const validateFriendId = async (req, res, next) => {
  const { friendId } = req.body;
  if (!friendId || isNaN(friendId)) return next(new AppError('Invalid friend ID', 400));
  next();
};

const validateRequestId = async (req, res, next) => {
  const { requestId } = req.params;
  const connection = await UserConnections.findByPk(requestId);
  if (!connection) return next(new AppError('Friend request not found', 404));
  req.connection = connection;
  next();
};

module.exports = { validateFriendId, validateRequestId };