'use strict';

const { Op } = require('sequelize');
const db = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const inventoryService = {
  getInventoryLevels: async (merchantId, branchId = null, filters = {}, pagination = { page: 1, limit: 20 }) => {
    logger.info('getInventoryLevels called:', { merchantId, branchId, filters, pagination });
    const where = { merchant_id: merchantId, deleted_at: null };
    if (branchId) where.branch_id = branchId;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.low_stock === 'true') {
      where[Op.and] = [
        { quantity: { [Op.ne]: null } },
        { minimum_stock_level: { [Op.ne]: null } },
        db.sequelize.literal('quantity <= minimum_stock_level'),
      ];
    }
    if (filters.out_of_stock === 'true') where.quantity = 0;
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { sku: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const inventoryData = await db.MenuInventory.findAndCountAll({
      where,
      attributes: [
        'id', 'name', 'sku', 'quantity', 'minimum_stock_level', 'measurement_unit',
        'availability_status', 'thumbnail_url', 'price', 'category_id', 'branch_id',
      ],
      include: [{ model: db.ProductCategory, as: 'category', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset,
      order: [['name', 'ASC']],
    });

    logger.info('getInventoryLevels result:', { total: inventoryData.count, page: pagination.page });
    return {
      data: inventoryData.rows,
      total: inventoryData.count,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(inventoryData.count / pagination.limit),
    };
  },

  updateStockLevel: async (merchantId, productId, data, userId) => {
    logger.info('updateStockLevel called:', { merchantId, productId, data });
    const product = await db.MenuInventory.findOne({
      where: { id: productId, merchant_id: merchantId, deleted_at: null },
    });
    if (!product) throw new AppError('Product not found or access denied', 404);

    const t = await db.sequelize.transaction();
    try {
      let newQuantity;
      let adjustmentType;
      if (data.adjustment_type === 'set') {
        newQuantity = parseFloat(data.quantity);
        adjustmentType = 'set';
      } else if (data.adjustment_type === 'add') {
        newQuantity = (product.quantity || 0) + parseFloat(data.quantity);
        adjustmentType = 'add';
      } else if (data.adjustment_type === 'subtract') {
        newQuantity = Math.max(0, (product.quantity || 0) - parseFloat(data.quantity));
        adjustmentType = 'subtract';
      } else {
        newQuantity = parseFloat(data.quantity);
        adjustmentType = 'set';
      }
      newQuantity = Math.max(0, newQuantity);

      let availabilityStatus = product.availability_status;
      if (newQuantity === 0) {
        availabilityStatus = 'out-of-stock';
      } else if (data.force_status) {
        availabilityStatus = data.availability_status;
      } else if (availabilityStatus === 'out-of-stock' && newQuantity > 0) {
        availabilityStatus = 'in-stock';
      }

      const updatedProduct = await product.update(
        { quantity: newQuantity, availability_status: availabilityStatus, updated_by: userId },
        { transaction: t }
      );

      await db.InventoryAdjustmentLog.create(
        {
          menu_item_id: productId,
          merchant_id: merchantId,
          branch_id: product.branch_id,
          adjustment_type: adjustmentType,
          previous_quantity: product.quantity || 0,
          new_quantity: newQuantity,
          adjustment_amount: parseFloat(data.quantity),
          reason: data.reason || 'Manual adjustment',
          performed_by: userId,
          reference_id: data.reference_id || null,
          reference_type: data.reference_type || 'manual',
        },
        { transaction: t }
      );

      await t.commit();
      logger.info('updateStockLevel completed:', { productId, newQuantity });
      return updatedProduct;
    } catch (error) {
      await t.rollback();
      logger.error(`Error updating stock level for product ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Process stock adjustments based on order actions
   */
  processOrderStockAdjustment: async (orderItem, action, transaction) => {
    const product = await db.MenuInventory.findByPk(orderItem.menu_item_id, { transaction });
    if (!product || product.quantity === null) return false;

    let newQuantity = product.quantity;
    let adjustmentType = '';
    let reason = '';
    switch (action) {
      case 'reserve':
        newQuantity = Math.max(0, product.quantity - orderItem.quantity);
        adjustmentType = 'subtract';
        reason = 'Order reservation';
        break;
      case 'confirm':
        adjustmentType = 'subtract';
        reason = 'Order confirmation';
        break;
      case 'cancel':
        newQuantity = product.quantity + orderItem.quantity;
        adjustmentType = 'add';
        reason = 'Order cancellation';
        break;
      default:
        return false;
    }

    if (action === 'reserve' || action === 'cancel') {
      await product.update(
        {
          quantity: newQuantity,
          availability_status: newQuantity > 0 ? product.availability_status : 'out-of-stock',
        },
        { transaction }
      );
      await db.InventoryAdjustmentLog.create(
        {
          menu_item_id: product.id,
          merchant_id: product.merchant_id,
          branch_id: product.branch_id,
          adjustment_type: adjustmentType,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          adjustment_amount: orderItem.quantity,
          reason,
          performed_by: orderItem.order_id,
          reference_id: orderItem.order_id,
          reference_type: 'order',
        },
        { transaction }
      );
    }
    return true;
  },

  /**
   * Bulk update inventory items
   */
  bulkUpdateInventory: async (merchantId, branchId, items, userId) => {
    if (!Array.isArray(items) || items.length === 0)
      throw new AppError('Invalid inventory update data', 400);

    const t = await db.sequelize.transaction();
    try {
      const results = { total: items.length, successful: 0, failed: 0, errors: [] };
      for (const item of items) {
        try {
          if (!item.id && !item.sku) throw new Error('Either product ID or SKU is required');
          const whereClause = { merchant_id: merchantId, deleted_at: null };
          if (item.id) whereClause.id = item.id;
          else if (item.sku) whereClause.sku = item.sku;
          if (branchId) whereClause.branch_id = branchId;

          const product = await db.MenuInventory.findOne({ where: whereClause, transaction: t });
          if (!product) throw new Error(`Product ${item.id || item.sku} not found`);

          let newQuantity;
          let adjustmentType;
          if (item.adjustment_type === 'set') {
            newQuantity = parseFloat(item.quantity);
            adjustmentType = 'set';
          } else if (item.adjustment_type === 'add') {
            newQuantity = (product.quantity || 0) + parseFloat(item.quantity);
            adjustmentType = 'add';
          } else if (item.adjustment_type === 'subtract') {
            newQuantity = Math.max(0, (product.quantity || 0) - parseFloat(item.quantity));
            adjustmentType = 'subtract';
          } else {
            newQuantity = parseFloat(item.quantity);
            adjustmentType = 'set';
          }
          newQuantity = Math.max(0, newQuantity);

          let availabilityStatus = product.availability_status;
          if (newQuantity === 0) availabilityStatus = 'out-of-stock';
          else if (availabilityStatus === 'out-of-stock' && newQuantity > 0)
            availabilityStatus = 'in-stock';

          await product.update(
            {
              quantity: newQuantity,
              availability_status: availabilityStatus,
              updated_by: userId,
            },
            { transaction: t }
          );

          await db.InventoryAdjustmentLog.create(
            {
              menu_item_id: product.id,
              merchant_id: merchantId,
              branch_id: product.branch_id,
              adjustment_type: adjustmentType,
              previous_quantity: product.quantity || 0,
              new_quantity: newQuantity,
              adjustment_amount: parseFloat(item.quantity),
              reason: item.reason || 'Bulk update',
              performed_by: userId,
              reference_id: item.reference_id || null,
              reference_type: 'bulk_update',
            },
            { transaction: t }
          );

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({ item: item.id || item.sku, error: error.message });
        }
      }

      await db.InventoryBulkUpdate.create(
        {
          merchant_id: merchantId,
          branch_id: branchId,
          total_items: results.total,
          successful_items: results.successful,
          failed_items: results.failed,
          error_details: results.errors.length > 0 ? results.errors : null,
          performed_by: userId,
        },
        { transaction: t }
      );

      await t.commit();
      return results;
    } catch (error) {
      await t.rollback();
      logger.error(`Error performing bulk inventory update for merchant ${merchantId}:`, error);
      throw error;
    }
  },

  getInventoryStatistics: async (merchantId, branchId = null) => {
    logger.info('getInventoryStatistics called:', { merchantId, branchId });

    const baseWhere = `"merchant_id" = :merchantId AND "deleted_at" IS NULL`;
    const branchWhere = branchId ? ` AND "branch_id" = :branchId` : '';

    const [totalResult] = await db.sequelize.query(
      `SELECT COUNT(*) AS count FROM "menu_inventories" WHERE ${baseWhere}${branchWhere}`,
      { replacements: { merchantId, branchId }, type: db.sequelize.QueryTypes.SELECT }
    );
    const totalProducts = parseInt(totalResult.count, 10);
    logger.info('totalProducts computed:', { totalProducts });

    const [trackedResult] = await db.sequelize.query(
      `SELECT COUNT(*) AS count FROM "menu_inventories" WHERE ${baseWhere}${branchWhere} AND "quantity" IS NOT NULL`,
      { replacements: { merchantId, branchId }, type: db.sequelize.QueryTypes.SELECT }
    );
    const trackedProducts = parseInt(trackedResult.count, 10);
    logger.info('trackedProducts computed:', { trackedProducts });

    const [outOfStockResult] = await db.sequelize.query(
      `SELECT COUNT(*) AS count FROM "menu_inventories" WHERE ${baseWhere}${branchWhere} AND "quantity" = 0 AND "availability_status" = 'out-of-stock'`,
      { replacements: { merchantId, branchId }, type: db.sequelize.QueryTypes.SELECT }
    );
    const outOfStockProducts = parseInt(outOfStockResult.count, 10);
    logger.info('outOfStockProducts computed:', { outOfStockProducts });

    const [lowStockResult] = await db.sequelize.query(
      `SELECT COUNT(*) AS count FROM "menu_inventories"
       WHERE ${baseWhere}${branchWhere}
         AND "quantity" IS NOT NULL
         AND "quantity" > 0
         AND "minimum_stock_level" IS NOT NULL
         AND "quantity" <= "minimum_stock_level"`,
      { replacements: { merchantId, branchId }, type: db.sequelize.QueryTypes.SELECT }
    );
    const lowStockProducts = parseInt(lowStockResult.count, 10);
    logger.info('lowStockProducts computed:', { lowStockProducts });

    const [valueResult] = await db.sequelize.query(
      `SELECT SUM(CASE WHEN "quantity" IS NOT NULL THEN "quantity" * "price" ELSE 0 END) AS total
       FROM "menu_inventories" WHERE ${baseWhere}${branchWhere}`,
      { replacements: { merchantId, branchId }, type: db.sequelize.QueryTypes.SELECT }
    );
    const inventoryValue = parseFloat(valueResult.total) || 0;
    logger.info('inventoryValue computed:', { inventoryValue });

    logger.info('getInventoryStatistics result:', { totalProducts, trackedProducts, outOfStockProducts, lowStockProducts, inventoryValue });
    return {
      total_products: totalProducts,
      tracked_products: trackedProducts,
      out_of_stock_products: outOfStockProducts,
      low_stock_products: lowStockProducts,
      inventory_value: inventoryValue,
    };
  },
};

module.exports = inventoryService;