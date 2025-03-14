// src/services/merchantServices/productServices/inventoryService.js
const { Op } = require('sequelize');
const db = require('@models');
const AppError = require('@utils/AppError');
const { eventManager } = require('@services/eventManager');
const { productEvents } = require('@config/merchantEvents/productEvents');
const notificationService = require('@services/notificationService');
const logger = require('@utils/logger');

/**
 * Get current inventory levels for products
 * @param {Number} merchantId - Merchant ID
 * @param {Number} branchId - Optional branch ID for filtering
 * @param {Object} filters - Optional filters
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Inventory data with pagination
 */
exports.getInventoryLevels = async (merchantId, branchId = null, filters = {}, pagination = { page: 1, limit: 20 }) => {
  const where = { merchant_id: merchantId, deleted_at: null };
  
  // Add branch filter if provided
  if (branchId) {
    where.branch_id = branchId;
  }
  
  // Add category filter if provided
  if (filters.category_id) {
    where.category_id = filters.category_id;
  }
  
  // Add low stock filter if provided
  if (filters.low_stock === 'true') {
    where[Op.and] = [
      { quantity: { [Op.ne]: null } },
      { minimum_stock_level: { [Op.ne]: null } },
      db.sequelize.literal('quantity <= minimum_stock_level')
    ];
  }
  
  // Add out of stock filter if provided
  if (filters.out_of_stock === 'true') {
    where.quantity = 0;
  }
  
  // Add search filter if provided
  if (filters.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${filters.search}%` } },
      { sku: { [Op.iLike]: `%${filters.search}%` } }
    ];
  }
  
  // Calculate offset for pagination
  const offset = (pagination.page - 1) * pagination.limit;
  
  // Fetch inventory data with pagination
  const inventoryData = await db.MenuInventory.findAndCountAll({
    where,
    attributes: [
      'id', 'name', 'sku', 'quantity', 'minimum_stock_level', 
      'measurement_unit', 'availability_status', 'thumbnail_url',
      'price', 'category_id', 'branch_id'
    ],
    include: [
      {
        model: db.ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }
    ],
    limit: pagination.limit,
    offset,
    order: [['name', 'ASC']]
  });
  
  return {
    data: inventoryData.rows,
    total: inventoryData.count,
    page: pagination.page,
    limit: pagination.limit,
    pages: Math.ceil(inventoryData.count / pagination.limit)
  };
};

/**
 * Update stock level for a product
 * @param {Number} merchantId - Merchant ID
 * @param {Number} productId - Product ID
 * @param {Object} data - Stock update data
 * @param {Number} userId - User making the update
 * @returns {Promise<Object>} Updated product
 */
exports.updateStockLevel = async (merchantId, productId, data, userId) => {
  // Find the product and check ownership
  const product = await db.MenuInventory.findOne({
    where: {
      id: productId,
      merchant_id: merchantId,
      deleted_at: null
    }
  });
  
  if (!product) {
    throw new AppError('Product not found or access denied', 404);
  }
  
  // Start a transaction
  const t = await db.sequelize.transaction();
  
  try {
    // Determine new quantity
    let newQuantity;
    let adjustmentType;
    
    if (data.adjustment_type === 'set') {
      // Set to specific value
      newQuantity = parseFloat(data.quantity);
      adjustmentType = 'set';
    } else if (data.adjustment_type === 'add') {
      // Add to current quantity
      newQuantity = (product.quantity || 0) + parseFloat(data.quantity);
      adjustmentType = 'add';
    } else if (data.adjustment_type === 'subtract') {
      // Subtract from current quantity
      newQuantity = Math.max(0, (product.quantity || 0) - parseFloat(data.quantity));
      adjustmentType = 'subtract';
    } else {
      // Default to setting the value
      newQuantity = parseFloat(data.quantity);
      adjustmentType = 'set';
    }
    
    // Make sure quantity is non-negative
    newQuantity = Math.max(0, newQuantity);
    
    // Update availability status based on quantity
    let availabilityStatus = product.availability_status;
    
    if (newQuantity === 0) {
      availabilityStatus = 'out-of-stock';
    } else if (data.force_status) {
      // Use the provided status if force_status is true
      availabilityStatus = data.availability_status;
    } else if (availabilityStatus === 'out-of-stock' && newQuantity > 0) {
      // If it was out of stock and now has quantity, update to in-stock
      availabilityStatus = 'in-stock';
    }
    
    // Update the product
    const updatedProduct = await product.update({
      quantity: newQuantity,
      availability_status: availabilityStatus,
      updated_by: userId
    }, { transaction: t });
    
    // Create inventory adjustment log
    await db.InventoryAdjustmentLog.create({
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
      reference_type: data.reference_type || 'manual'
    }, { transaction: t });
    
    // Commit transaction
    await t.commit();
    
    // Check for low stock and trigger alert if necessary
    await this.checkAndTriggerLowStockAlert(updatedProduct);
    
    // Emit inventory updated event
    eventManager.emit(productEvents.INVENTORY_UPDATED, {
      merchantId,
      productId,
      branchId: product.branch_id,
      previousQuantity: product.quantity || 0,
      newQuantity,
      adjustmentType,
      reason: data.reason || 'Manual adjustment',
      userId
    });
    
    return updatedProduct;
  } catch (error) {
    // Rollback transaction in case of error
    await t.rollback();
    logger.error(`Error updating stock level for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Process automatic stock adjustment from order
 * @param {Object} orderItem - Order item data
 * @param {String} action - Action type (reserve, confirm, cancel)
 * @param {Transaction} transaction - Sequelize transaction
 * @returns {Promise<Boolean>} Success status
 */
exports.processOrderStockAdjustment = async (orderItem, action, transaction) => {
  // Get the product
  const product = await db.MenuInventory.findByPk(orderItem.menu_item_id, { transaction });
  
  if (!product || product.quantity === null) {
    // Skip if product not found or doesn't track inventory
    return false;
  }
  
  let newQuantity = product.quantity;
  let adjustmentType = '';
  let reason = '';
  
  switch (action) {
    case 'reserve':
      // Reserve stock for pending order
      newQuantity = Math.max(0, product.quantity - orderItem.quantity);
      adjustmentType = 'subtract';
      reason = 'Order reservation';
      break;
      
    case 'confirm':
      // Confirm stock deduction for completed order
      // Stock was already reserved, no further action needed if using reserve
      adjustmentType = 'subtract';
      reason = 'Order confirmation';
      break;
      
    case 'cancel':
      // Return stock for cancelled order
      newQuantity = product.quantity + orderItem.quantity;
      adjustmentType = 'add';
      reason = 'Order cancellation';
      break;
      
    default:
      return false;
  }
  
  // Only proceed if there's an actual change
  if (action === 'reserve' || action === 'cancel') {
    // Update product quantity
    await product.update({
      quantity: newQuantity,
      availability_status: newQuantity > 0 ? product.availability_status : 'out-of-stock'
    }, { transaction });
    
    // Create adjustment log
    await db.InventoryAdjustmentLog.create({
      menu_item_id: product.id,
      merchant_id: product.merchant_id,
      branch_id: product.branch_id,
      adjustment_type: adjustmentType,
      previous_quantity: product.quantity,
      new_quantity: newQuantity,
      adjustment_amount: orderItem.quantity,
      reason,
      performed_by: orderItem.order_id, // Use order ID as reference
      reference_id: orderItem.order_id,
      reference_type: 'order'
    }, { transaction });
    
    // Check for low stock
    if (action === 'reserve' && product.minimum_stock_level !== null) {
      await this.checkAndTriggerLowStockAlert(product);
    }
  }
  
  return true;
};

/**
 * Check if product is at or below minimum stock level and trigger alert
 * @param {Object} product - Product object
 * @returns {Promise<Boolean>} Whether alert was triggered
 */
exports.checkAndTriggerLowStockAlert = async (product) => {
  try {
    // Skip if no minimum stock level defined or quantity is not tracked
    if (product.minimum_stock_level === null || product.quantity === null) {
      return false;
    }
    
    // Check if at or below minimum level
    if (product.quantity <= product.minimum_stock_level) {
      // Get recent alerts to avoid duplication
      const recentAlert = await db.InventoryAlert.findOne({
        where: {
          menu_item_id: product.id,
          type: 'low_stock',
          resolved: false,
          created_at: {
            [Op.gt]: db.sequelize.literal("NOW() - INTERVAL '24 HOURS'")
          }
        }
      });
      
      // Only create new alert if none exists in last 24 hours
      if (!recentAlert) {
        // Create alert record
        await db.InventoryAlert.create({
          menu_item_id: product.id,
          merchant_id: product.merchant_id,
          branch_id: product.branch_id,
          type: 'low_stock',
          details: {
            current_quantity: product.quantity,
            minimum_stock_level: product.minimum_stock_level,
            product_name: product.name
          },
          resolved: false
        });
        
        // Send notification
        await notificationService.sendMerchantNotification({
          merchantId: product.merchant_id,
          title: 'Low Stock Alert',
          message: `${product.name} is running low on stock (${product.quantity} ${product.measurement_unit}s remaining)`,
          type: 'inventory_alert',
          data: {
            product_id: product.id,
            current_quantity: product.quantity,
            minimum_level: product.minimum_stock_level
          },
          priority: 'medium'
        });
        
        // Emit low stock event
        eventManager.emit(productEvents.LOW_STOCK_ALERT, {
          merchantId: product.merchant_id,
          branchId: product.branch_id,
          productId: product.id,
          productName: product.name,
          currentQuantity: product.quantity,
          minimumStockLevel: product.minimum_stock_level
        });
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error(`Error checking low stock alert for product ${product.id}:`, error);
    return false;
  }
};

/**
 * Perform bulk inventory update
 * @param {Number} merchantId - Merchant ID
 * @param {Number} branchId - Optional branch ID
 * @param {Array} items - Array of items to update
 * @param {Number} userId - User making the update
 * @returns {Promise<Object>} Results of bulk update
 */
exports.bulkUpdateInventory = async (merchantId, branchId, items, userId) => {
  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Invalid inventory update data', 400);
  }
  
  // Start transaction
  const t = await db.sequelize.transaction();
  
  try {
    const results = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    // Process each item
    for (const item of items) {
      try {
        // Validate required fields
        if (!item.id && !item.sku) {
          throw new Error('Either product ID or SKU is required');
        }
        
        // Find the product
        const whereClause = {
          merchant_id: merchantId,
          deleted_at: null
        };
        
        if (item.id) {
          whereClause.id = item.id;
        } else if (item.sku) {
          whereClause.sku = item.sku;
        }
        
        if (branchId) {
          whereClause.branch_id = branchId;
        }
        
        const product = await db.MenuInventory.findOne({
          where: whereClause,
          transaction: t
        });
        
        if (!product) {
          throw new Error(`Product ${item.id || item.sku} not found`);
        }
        
        // Determine the new quantity
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
          // Default to setting the value
          newQuantity = parseFloat(item.quantity);
          adjustmentType = 'set';
        }
        
        // Ensure non-negative quantity
        newQuantity = Math.max(0, newQuantity);
        
        // Update availability status based on quantity
        let availabilityStatus = product.availability_status;
        
        if (newQuantity === 0) {
          availabilityStatus = 'out-of-stock';
        } else if (availabilityStatus === 'out-of-stock' && newQuantity > 0) {
          availabilityStatus = 'in-stock';
        }
        
        // Update the product
        await product.update({
          quantity: newQuantity,
          availability_status: availabilityStatus,
          updated_by: userId
        }, { transaction: t });
        
        // Create inventory adjustment log
        await db.InventoryAdjustmentLog.create({
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
          reference_type: 'bulk_update'
        }, { transaction: t });
        
        // Check for low stock
        await this.checkAndTriggerLowStockAlert({
          ...product.toJSON(),
          quantity: newQuantity
        });
        
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: item.id || item.sku,
          error: error.message
        });
      }
    }
    
    // Create a bulk update record
    await db.InventoryBulkUpdate.create({
      merchant_id: merchantId,
      branch_id: branchId,
      total_items: results.total,
      successful_items: results.successful,
      failed_items: results.failed,
      error_details: results.errors.length > 0 ? results.errors : null,
      performed_by: userId
    }, { transaction: t });
    
    // Commit transaction
    await t.commit();
    
    // Emit event
    eventManager.emit(productEvents.INVENTORY_BULK_UPDATED, {
      merchantId,
      branchId,
      results,
      userId
    });
    
    return results;
  } catch (error) {
    // Rollback transaction in case of error
    await t.rollback();
    logger.error(`Error performing bulk inventory update for merchant ${merchantId}:`, error);
    throw error;
  }
};

/**
 * Import inventory data from file
 * @param {Number} merchantId - Merchant ID
 * @param {Number} branchId - Optional branch ID
 * @param {Object} fileData - File data
 * @param {Number} userId - User performing the import
 * @returns {Promise<Object>} Import results
 */
exports.importInventoryFromFile = async (merchantId, branchId, fileData, userId) => {
  // Validate file type
  const fileType = fileData.mimetype;
  let importFunction;
  
  if (fileType === 'application/vnd.ms-excel' || fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    importFunction = excelService.parseExcelInventory;
  } else if (fileType === 'text/csv') {
    importFunction = excelService.parseCsvInventory;
  } else {
    throw new AppError('Unsupported file format. Please use CSV or Excel file.', 400);
  }
  
  try {
    // Parse the file
    const items = await importFunction(fileData.buffer);
    
    if (!items || items.length === 0) {
      throw new AppError('No valid inventory data found in the file', 400);
    }
    
    // Perform bulk update with the parsed data
    return await this.bulkUpdateInventory(merchantId, branchId, items, userId);
  } catch (error) {
    logger.error(`Error importing inventory from file for merchant ${merchantId}:`, error);
    throw error;
  }
};

/**
 * Get inventory adjustment logs
 * @param {Number} merchantId - Merchant ID
 * @param {Number} productId - Optional product ID
 * @param {Object} filters - Optional filters
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Logs with pagination
 */
exports.getInventoryLogs = async (merchantId, productId = null, filters = {}, pagination = { page: 1, limit: 20 }) => {
  const where = { merchant_id: merchantId };
  
  // Add product filter if provided
  if (productId) {
    where.menu_item_id = productId;
  }
  
  // Add branch filter if provided
  if (filters.branch_id) {
    where.branch_id = filters.branch_id;
  }
  
  // Add adjustment type filter if provided
  if (filters.adjustment_type) {
    where.adjustment_type = filters.adjustment_type;
  }
  
  // Add date range filter if provided
  if (filters.start_date && filters.end_date) {
    where.created_at = {
      [Op.between]: [
        new Date(filters.start_date),
        new Date(filters.end_date)
      ]
    };
  } else if (filters.start_date) {
    where.created_at = {
      [Op.gte]: new Date(filters.start_date)
    };
  } else if (filters.end_date) {
    where.created_at = {
      [Op.lte]: new Date(filters.end_date)
    };
  }
  
  // Calculate offset for pagination
  const offset = (pagination.page - 1) * pagination.limit;
  
  // Fetch adjustment logs with pagination
  const logs = await db.InventoryAdjustmentLog.findAndCountAll({
    where,
    include: [
      {
        model: db.MenuInventory,
        as: 'product',
        attributes: ['id', 'name', 'sku']
      },
      {
        model: db.User,
        as: 'performer',
        attributes: ['id', 'name', 'email']
      }
    ],
    limit: pagination.limit,
    offset,
    order: [['created_at', 'DESC']]
  });
  
  return {
    data: logs.rows,
    total: logs.count,
    page: pagination.page,
    limit: pagination.limit,
    pages: Math.ceil(logs.count / pagination.limit)
  };
};

/**
 * Get inventory alerts
 * @param {Number} merchantId - Merchant ID
 * @param {Number} branchId - Optional branch ID
 * @param {Object} filters - Optional filters
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Alerts with pagination
 */
exports.getInventoryAlerts = async (merchantId, branchId = null, filters = {}, pagination = { page: 1, limit: 20 }) => {
  const where = { merchant_id: merchantId };
  
  // Add branch filter if provided
  if (branchId) {
    where.branch_id = branchId;
  }
  
  // Add resolved filter if provided
  if (filters.resolved !== undefined) {
    where.resolved = filters.resolved === 'true';
  }
  
  // Add alert type filter if provided
  if (filters.type) {
    where.type = filters.type;
  }
  
  // Calculate offset for pagination
  const offset = (pagination.page - 1) * pagination.limit;
  
  // Fetch alerts with pagination
  const alerts = await db.InventoryAlert.findAndCountAll({
    where,
    include: [
      {
        model: db.MenuInventory,
        as: 'product',
        attributes: ['id', 'name', 'sku', 'quantity', 'minimum_stock_level', 'measurement_unit']
      }
    ],
    limit: pagination.limit,
    offset,
    order: [['created_at', 'DESC']]
  });
  
  return {
    data: alerts.rows,
    total: alerts.count,
    page: pagination.page,
    limit: pagination.limit,
    pages: Math.ceil(alerts.count / pagination.limit)
  };
};

/**
 * Resolve inventory alert
 * @param {Number} merchantId - Merchant ID
 * @param {Number} alertId - Alert ID
 * @param {Number} userId - User resolving the alert
 * @returns {Promise<Object>} Updated alert
 */
exports.resolveInventoryAlert = async (merchantId, alertId, userId) => {
  const alert = await db.InventoryAlert.findOne({
    where: {
      id: alertId,
      merchant_id: merchantId
    }
  });
  
  if (!alert) {
    throw new AppError('Alert not found', 404);
  }
  
  if (alert.resolved) {
    throw new AppError('Alert already resolved', 400);
  }
  
  // Update alert
  await alert.update({
    resolved: true,
    resolved_by: userId,
    resolved_at: new Date()
  });
  
  return alert;
};

/**
 * Get inventory statistics
 * @param {Number} merchantId - Merchant ID
 * @param {Number} branchId - Optional branch ID
 * @returns {Promise<Object>} Inventory statistics
 */
exports.getInventoryStatistics = async (merchantId, branchId = null) => {
  const whereClause = { merchant_id: merchantId, deleted_at: null };
  
  if (branchId) {
    whereClause.branch_id = branchId;
  }
  
  // Get total product count
  const totalProducts = await db.MenuInventory.count({
    where: whereClause
  });
  
  // Get count of products with quantity tracking
  const trackedProducts = await db.MenuInventory.count({
    where: {
      ...whereClause,
      quantity: { [Op.ne]: null }
    }
  });
  
  // Get count of out of stock products
  const outOfStockProducts = await db.MenuInventory.count({
    where: {
      ...whereClause,
      quantity: 0,
      availability_status: 'out-of-stock'
    }
  });
  
  // Get count of low stock products
  const lowStockProducts = await db.MenuInventory.count({
    where: {
      ...whereClause,
      quantity: { [Op.ne]: null },
      minimum_stock_level: { [Op.ne]: null },
      [Op.and]: [
        db.sequelize.literal('quantity <= minimum_stock_level'),
        db.sequelize.literal('quantity > 0')
      ]
    }
  });
  
  // Get active alerts count
  const activeAlerts = await db.InventoryAlert.count({
    where: {
      merchant_id: merchantId,
      ...(branchId ? { branch_id: branchId } : {}),
      resolved: false
    }
  });
  
  // Get total inventory value
  const inventoryValue = await db.MenuInventory.sum(
    db.sequelize.literal('CASE WHEN quantity IS NOT NULL THEN quantity * price ELSE 0 END'),
    {
      where: whereClause
    }
  );
  
  return {
    total_products: totalProducts,
    tracked_products: trackedProducts,
    out_of_stock_products: outOfStockProducts,
    low_stock_products: lowStockProducts,
    active_alerts: activeAlerts,
    inventory_value: inventoryValue || 0
  };
};