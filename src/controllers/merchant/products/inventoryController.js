'use strict';
const inventoryService = require('@services/merchant/products/inventoryService');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const catchAsync = require('@utils/catchAsync');

const inventoryController = {
  getInventoryLevels: catchAsync(async (req, res, next) => {
    const { merchantId } = req.user;
    const { branchId } = req.params;
    const { page, limit, category_id, low_stock, out_of_stock, search } = req.query;

    const filters = { category_id, low_stock, out_of_stock, search };
    const pagination = { page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 };

    const inventory = await inventoryService.getInventoryLevels(merchantId, branchId || null, filters, pagination);

    logger.info('Inventory levels retrieved', { merchantId, branchId, filters, pagination });
    res.status(200).json({
      status: 'success',
      data: inventory.data,
      meta: { total: inventory.total, page: inventory.page, limit: inventory.limit, pages: inventory.pages },
    });
  }),

  updateStockLevel: catchAsync(async (req, res, next) => {
    const { merchantId, id: userId } = req.user;
    const { productId } = req.params;
    const { quantity, adjustment_type = 'set', availability_status, force_status = false, reason, reference_id, reference_type } = req.body;

    if (!quantity || isNaN(parseFloat(quantity))) {
      return next(new AppError('Quantity is required and must be a number', 400));
    }

    const data = {
      quantity: parseFloat(quantity),
      adjustment_type,
      availability_status,
      force_status: force_status === true || force_status === 'true',
      reason,
      reference_id,
      reference_type,
    };

    const updatedProduct = await inventoryService.updateStockLevel(merchantId, productId, data, userId);

    logger.info('Stock level updated', { merchantId, productId, adjustment_type, quantity });
    res.status(200).json({ status: 'success', data: updatedProduct });
  }),

  bulkUpdateInventory: catchAsync(async (req, res, next) => {
    const { merchantId, id: userId } = req.user;
    const { branchId } = req.params;
    const items = Array.isArray(req.body) ? req.body : req.body.items; // Handle both formats

    logger.info('bulkUpdateInventory body:', { body: req.body, items });

    if (!Array.isArray(items) || items.length === 0) {
      return next(new AppError('Items must be a non-empty array', 400));
    }

    for (const item of items) {
      if ((!item.id && !item.sku) || !item.quantity || isNaN(parseFloat(item.quantity))) {
        return next(new AppError('Each item must have an id or sku and a valid quantity', 400));
      }
    }

    const result = await inventoryService.bulkUpdateInventory(merchantId, branchId || null, items, userId);

    logger.info('Bulk inventory update completed', {
      merchantId,
      branchId,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });

    res.status(200).json({
      status: 'success',
      data: { total: result.total, successful: result.successful, failed: result.failed, errors: result.errors },
    });
  }),

  getInventoryStatistics: catchAsync(async (req, res, next) => {
    const { merchantId } = req.user;
    const { branchId } = req.params;

    const stats = await inventoryService.getInventoryStatistics(merchantId, branchId || null);

    logger.info('Inventory statistics retrieved', { merchantId, branchId });
    res.status(200).json({ status: 'success', data: stats });
  }),
};

module.exports = inventoryController;