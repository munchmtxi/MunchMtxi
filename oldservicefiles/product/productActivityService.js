// src/services/merchantServices/productServices/productActivityService.js
const { Op } = require('sequelize');
const { 
  ProductActivityLog, 
  productDraft, 
  merchantBranch, 
  User
} = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger').logger;
const { BUSINESS_TYPES } = require('@config/constants/businessTypes');

class ProductActivityService {
  /**
   * Log product activity
   * @param {UUID} productId - ID of the product
   * @param {UUID} merchantBranchId - ID of the merchant branch
   * @param {UUID} actorId - ID of the actor (merchant, staff, customer, etc.)
   * @param {String} actorType - Type of actor (merchant, staff, customer, system)
   * @param {String} actionType - Type of action performed
   * @param {Object} previousState - Previous state of the product (if applicable)
   * @param {Object} newState - New state of the product (if applicable)
   * @param {Object} metadata - Additional metadata about the action
   * @returns {Promise<ProductActivityLog>} - The created activity log
   */
  async logActivity(
    productId,
    merchantBranchId,
    actorId,
    actorType,
    actionType,
    previousState = null,
    newState = null,
    metadata = {}
  ) {
    try {
      // Get the current version number
      const latestVersion = await this.getLatestVersion(productId);
      
      // Format timestamp with the branch's timezone if available
      let timestamp = new Date();
      try {
        const branch = await merchantBranch.findByPk(merchantBranchId, {
          include: [{
            model: Merchant,
            as: 'merchant'
          }]
        });
        
        if (branch && branch.merchant && branch.merchant.time_zone) {
          metadata.timezone = branch.merchant.time_zone;
        }
      } catch (error) {
        // Continue without timezone if there's an error
        logger.warn(`Could not get branch timezone: ${error.message}`);
      }
      
      // Create standardized metadata with source device info if available
      const enrichedMetadata = {
        ...metadata,
        timestamp_iso: timestamp.toISOString(),
        source: metadata.source || 'api'
      };
      
      const activityLog = await ProductActivityLog.create({
        productId,
        merchantBranchId,
        actorId,
        actorType,
        actionType,
        previousState,
        newState,
        metadata: enrichedMetadata,
        version: latestVersion + 1,
        timestamp
      });
      
      logger.info(`Product activity logged: ${actionType} for product ${productId}`, {
        productId,
        actorId,
        actorType,
        actionType,
        version: latestVersion + 1
      });
      
      return activityLog;
    } catch (error) {
      logger.error(`Error logging product activity: ${error.message}`, { error });
      throw new AppError('Failed to log product activity', 500);
    }
  }

  /**
   * Get the latest version number for a product
   * @param {UUID} productId - ID of the product
   * @returns {Promise<Number>} - The latest version number
   */
  async getLatestVersion(productId) {
    const latestLog = await ProductActivityLog.findOne({
      where: { productId },
      order: [['version', 'DESC']],
      attributes: ['version']
    });
    
    return latestLog ? latestLog.version : 0;
  }

  /**
   * Get activity history for a product
   * @param {UUID} productId - ID of the product
   * @param {Object} options - Query options (limit, offset, actionTypes, etc.)
   * @returns {Promise<Object>} - Object containing rows (activity logs) and count
   */
  async getActivityHistory(productId, options = {}) {
    const { 
      limit = 20, 
      offset = 0, 
      actionTypes = null,
      actorTypes = null,
      startDate = null,
      endDate = null,
      sortDirection = 'DESC',
      includeActorDetails = false
    } = options;
    
    const whereClause = { productId };
    
    if (actionTypes && actionTypes.length > 0) {
      whereClause.actionType = { [Op.in]: actionTypes };
    }
    
    if (actorTypes && actorTypes.length > 0) {
      whereClause.actorType = { [Op.in]: actorTypes };
    }
    
    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.timestamp = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.timestamp = { [Op.lte]: new Date(endDate) };
    }
    
    // Base include array
    const include = [
      {
        model: productDraft,
        as: 'product',
        attributes: ['id', 'name', 'sku', 'price', 'stock']
      }
    ];
    
    // Add actor details if requested
    if (includeActorDetails) {
      include.push({
        model: User,
        as: 'actor',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        required: false
      });
    }
    
    return ProductActivityLog.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['timestamp', sortDirection]],
      include
    });
  }

  /**
   * Rollback product to a specific version
   * @param {UUID} productId - ID of the product
   * @param {Number} targetVersion - Version to rollback to
   * @param {UUID} actorId - ID of the actor performing the rollback
   * @param {String} actorType - Type of actor performing the rollback
   * @param {UUID} branchId - ID of the branch (for permission checking)
   * @returns {Promise<Object>} - The rolled back product state
   */
  async rollbackToVersion(productId, targetVersion, actorId, actorType, branchId) {
    // Find the specific version
    const versionLog = await ProductActivityLog.findOne({
      where: {
        productId,
        version: targetVersion
      }
    });
    
    if (!versionLog) {
      throw new AppError(`Version ${targetVersion} not found for product ${productId}`, 404);
    }
    
    // Get the product from the product draft model
    const product = await productDraft.findByPk(productId);
    
    if (!product) {
      throw new AppError(`Product ${productId} not found`, 404);
    }
    
    // Check branch autonomy settings if actor is staff
    if (actorType === 'staff') {
      const branch = await merchantBranch.findByPk(branchId || product.merchantBranchId, {
        include: [{
          model: Merchant,
          as: 'merchant'
        }]
      });
      
      if (!branch) {
        throw new AppError('Branch not found', 404);
      }
      
      // Verify branch has autonomy for inventory management
      if (!branch.autonomy_settings.inventory_management) {
        throw new AppError('This branch does not have autonomy for inventory management', 403);
      }
      
      // Verify business type specific rules
      if (branch.merchant?.business_type) {
        const businessType = branch.merchant.business_type.toUpperCase();
        const typeConfig = BUSINESS_TYPES[businessType];
        
        if (typeConfig && typeConfig.restrictProductRollback) {
          throw new AppError(`Product rollback is restricted for ${businessType} business type`, 403);
        }
      }
    }
    
    // Store the current state before updating
    const currentState = product.toJSON();
    
    // Determine the state to restore
    const stateToRestore = versionLog.previousState || {};
    
    // Update the product with the rolled back state
    try {
      await product.update(stateToRestore);
      
      // Log the rollback activity
      await this.logActivity(
        productId,
        product.merchantBranchId,
        actorId,
        actorType,
        'rollback',
        currentState,
        stateToRestore,
        { 
          rolledBackToVersion: targetVersion,
          rollbackInitiatedBy: `${actorType}:${actorId}`,
          reason: stateToRestore.rollbackReason || 'Manual rollback'
        }
      );
      
      return product;
    } catch (error) {
      logger.error(`Error rolling back product: ${error.message}`, { error });
      throw new AppError('Failed to rollback product', 500);
    }
  }

  /**
   * Track customer interaction with a product
   * @param {UUID} productId - ID of the product
   * @param {UUID} merchantBranchId - ID of the merchant branch
   * @param {UUID} customerId - ID of the customer
   * @param {String} interactionType - Type of interaction (viewed, added_to_cart, reviewed)
   * @param {Object} metadata - Additional data about the interaction
   * @returns {Promise<ProductActivityLog>} - The created activity log
   */
  async trackCustomerInteraction(
    productId,
    merchantBranchId,
    customerId,
    interactionType,
    metadata = {}
  ) {
    return this.logActivity(
      productId,
      merchantBranchId,
      customerId,
      'customer',
      interactionType,
      null,
      null,
      {
        ...metadata,
        interaction_source: metadata.source || 'web',
        interaction_timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Get aggregated activity statistics for a product
   * @param {UUID} productId - ID of the product
   * @param {String} timespan - Time period to analyze (day, week, month, all)
   * @returns {Promise<Object>} - Statistics object
   */
  async getProductActivityStats(productId, timespan = 'month') {
    // Determine date range based on timespan
    const now = new Date();
    let startDate;
    
    switch (timespan) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = null;
    }
    
    const whereClause = { productId };
    if (startDate) {
      whereClause.timestamp = { [Op.gte]: startDate };
    }
    
    try {
      const sequelize = ProductActivityLog.sequelize;
      
      // Get activity counts by type
      const activityCounts = await ProductActivityLog.findAll({
        where: whereClause,
        attributes: [
          'actionType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['actionType']
      });
      
      // Get customer interaction counts
      const customerInteractions = await ProductActivityLog.findAll({
        where: {
          ...whereClause,
          actorType: 'customer',
          actionType: { [Op.in]: ['viewed', 'added_to_cart', 'reviewed'] }
        },
        attributes: [
          'actionType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['actionType']
      });
      
      // Format the results
      const activityStats = activityCounts.reduce((acc, item) => {
        acc[item.actionType] = parseInt(item.dataValues.count, 10);
        return acc;
      }, {});
      
      const interactionStats = customerInteractions.reduce((acc, item) => {
        acc[item.actionType] = parseInt(item.dataValues.count, 10);
        return acc;
      }, {
        viewed: 0,
        added_to_cart: 0,
        reviewed: 0
      });
      
      // Calculate conversion rates if possible
      let cartConversionRate = 0;
      let reviewConversionRate = 0;
      
      if (interactionStats.viewed > 0) {
        cartConversionRate = ((interactionStats.added_to_cart / interactionStats.viewed) * 100).toFixed(2);
        reviewConversionRate = ((interactionStats.reviewed / interactionStats.viewed) * 100).toFixed(2);
      }
      
      return {
        timespan,
        period: {
          start: startDate ? startDate.toISOString() : 'all time',
          end: new Date().toISOString()
        },
        activityStats,
        interactionStats,
        conversionMetrics: {
          cartConversionRate: parseFloat(cartConversionRate),
          reviewConversionRate: parseFloat(reviewConversionRate)
        },
        totalModifications: activityStats.updated || 0 + 
                           (activityStats.price_changed || 0) + 
                           (activityStats.description_updated || 0) + 
                           (activityStats.stock_adjusted || 0),
        totalRollbacks: activityStats.rollback || 0
      };
    } catch (error) {
      logger.error(`Error getting product activity stats: ${error.message}`, { error });
      throw new AppError('Failed to get product activity statistics', 500);
    }
  }
  
  /**
   * Compare two product versions
   * @param {UUID} productId - ID of the product
   * @param {Number} version1 - First version number
   * @param {Number} version2 - Second version number
   * @returns {Promise<Object>} - Comparison results
   */
  async compareVersions(productId, version1, version2) {
    try {
      // Get the two versions
      const [v1Log, v2Log] = await Promise.all([
        ProductActivityLog.findOne({
          where: { productId, version: version1 },
          order: [['version', 'ASC']]
        }),
        ProductActivityLog.findOne({
          where: { productId, version: version2 },
          order: [['version', 'ASC']]
        })
      ]);
      
      if (!v1Log || !v2Log) {
        throw new AppError('One or both versions not found', 404);
      }
      
      // Get states - use new_state of v1 and previous_state of v2
      const v1State = v1Log.newState || {};
      const v2State = v2Log.previousState || {};
      
      // Find differences
      const differences = {};
      const allKeys = new Set([...Object.keys(v1State), ...Object.keys(v2State)]);
      
      for (const key of allKeys) {
        if (JSON.stringify(v1State[key]) !== JSON.stringify(v2State[key])) {
          differences[key] = {
            v1: v1State[key],
            v2: v2State[key]
          };
        }
      }
      
      return {
        v1: {
          version: version1,
          timestamp: v1Log.timestamp,
          actor: {
            id: v1Log.actorId,
            type: v1Log.actorType
          }
        },
        v2: {
          version: version2,
          timestamp: v2Log.timestamp,
          actor: {
            id: v2Log.actorId,
            type: v2Log.actorType
          }
        },
        differences,
        changedFields: Object.keys(differences)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error comparing versions: ${error.message}`, { error });
      throw new AppError('Failed to compare product versions', 500);
    }
  }
}

module.exports = new ProductActivityService();