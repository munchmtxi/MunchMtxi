'use strict';
const jwt = require('jsonwebtoken');
const { logger } = require('@utils/logger');
const db = require('@models');
const AppError = require('@utils/appError');

logger.info('Middleware db contents:', { models: Object.keys(db) });

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next(new AppError('No token provided', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.User.findOne({
      where: { id: decoded.id, deleted_at: null },
      include: [{ model: db.Merchant, as: 'merchant_profile' }],
    });
    if (!user) return next(new AppError('User not found', 401));

    req.user = {
      id: user.id,
      role_id: user.role_id,
      merchantId: user.merchant_profile?.id, // Match controller expectation
      merchant_profile: user.merchant_profile, // Keep for compatibility
    };
    logger.info('JWT verified', { userId: req.user.id, merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    next(new AppError('Invalid or expired token', 401));
  }
};

const restrictToMerchant = (req, res, next) => {
  if (req.user.role_id !== 19) {
    return next(new AppError('Access denied: Merchants only', 403));
  }
  next();
};

const validateBranchOwnership = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { merchantId } = req.user;
    logger.info('validateBranchOwnership:', { userId: req.user.id, merchantId, branchId });

    if (!merchantId) throw new AppError('Merchant profile not found for user', 403);

    if (branchId) {
      if (!db.MerchantBranch) throw new Error('MerchantBranch model not loaded');
      const whereClause = { id: branchId, merchant_id: merchantId, deleted_at: null };
      logger.info('Branch query:', { whereClause });
      const branch = await db.MerchantBranch.findOne({ where: whereClause });
      if (!branch) return next(new AppError('Branch not found or access denied', 404));
      req.branch = branch;
    }
    next();
  } catch (error) {
    logger.error('Branch validation error', { error: error.message });
    next(new Error('Error validating branch'));
  }
};

const validateProductOwnership = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { merchantId } = req.user;
    logger.info('validateProductOwnership:', { userId: req.user.id, merchantId, productId });

    if (!merchantId) throw new AppError('Merchant profile not found for user', 403);

    const whereClause = { id: productId, merchant_id: merchantId, deleted_at: null };
    logger.info('Product query:', { whereClause });
    const product = await db.MenuInventory.findOne({ where: whereClause });
    if (!product) return next(new AppError('Product not found or access denied', 404));
    req.product = product;
    next();
  } catch (error) {
    logger.error('Product validation error', { error: error.message });
    next(new AppError('Error validating product', 500));
  }
};

module.exports = { protect, restrictToMerchant, validateBranchOwnership, validateProductOwnership };