'use strict';
const { InDiningOrder, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const validateOrderAccess = async (req, res, next) => {
  const { orderId } = req.params;
  const customerId = req.user.id;

  const order = await InDiningOrder.findByPk(orderId);
  if (!order) return next(new AppError('In-dining order not found', 404));
  if (order.customer_id !== customerId) return next(new AppError('Unauthorized', 403));

  req.order = order;
  next();
};

const validateBranchAccess = async (req, res, next) => {
  const { branchId } = req.query;
  if (!branchId) return next();

  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch || !branch.table_management_enabled) {
    return next(new AppError('Branch does not support in-dining', 400));
  }
  next();
};

const validateTipData = async (req, res, next) => {
  const { amount, allocation } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Tip amount must be positive', 400));
  if (allocation && typeof allocation !== 'object') return next(new AppError('Invalid allocation format', 400));
  next();
};

const validateFriendRequest = async (req, res, next) => {
  const { friendUserId } = req.body;
  if (!friendUserId || isNaN(friendUserId)) return next(new AppError('Invalid friend user ID', 400));
  next();
};

module.exports = {
  validateOrderAccess,
  validateBranchAccess,
  validateTipData,
  validateFriendRequest,
};