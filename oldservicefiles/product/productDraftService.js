// services/merchantServices/productServices/productDraftService.js
const { Op } = require('sequelize');
const { MenuInventory, ProductDraft, sequelize } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const productService = require('./productService');

/**
 * Create a new product draft
 * @param {Object} params - Parameters for creating a draft
 * @param {number} params.merchantId - Merchant ID
 * @param {number|null} params.branchId - Branch ID if applicable
 * @param {number|null} params.productId - Product ID if draft is for existing product
 * @param {Object} params.draftData - Draft data
 * @param {number} params.createdBy - User ID of creator
 * @returns {Promise<Object>} Created draft
 */
exports.createDraft = async ({ merchantId, branchId, productId, draftData, createdBy }) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Set draft metadata
    draftData.merchant_id = merchantId;
    if (branchId) draftData.branch_id = branchId;
    if (productId) draftData.menu_item_id = productId;
    draftData.created_by = createdBy;
    draftData.status = 'draft';
    draftData.version = await getNextVersion(productId, merchantId);
    
    // Create the draft
    const draft = await ProductDraft.create(draftData, { transaction });
    
    await transaction.commit();
    return draft;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error creating product draft for merchant ${merchantId}:`, error);
    throw new AppError('Failed to create product draft', 500);
  }
};

/**
 * Get all drafts for a merchant
 * @param {Object} params - Query parameters
 * @param {number} params.merchantId - Merchant ID
 * @param {number|null} params.branchId - Branch ID if applicable
 * @param {string|null} params.status - Draft status filter
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Array>} Drafts
 */
exports.getDrafts = async ({ merchantId, branchId, status, page = 1, limit = 10 }) => {
  try {
    const query = {
      where: {
        merchant_id: merchantId,
        deleted_at: null
      },
      order: [['updated_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [
        {
          model: MenuInventory,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'price', 'thumbnail_url']
        }
      ]
    };
    
    if (branchId) {
      query.where.branch_id = branchId;
    }
    
    if (status) {
      query.where.status = status;
    }
    
    const drafts = await ProductDraft.findAll(query);
    return drafts;
  } catch (error) {
    logger.error(`Error fetching drafts for merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch product drafts', 500);
  }
};

/**
 * Get a specific draft by ID
 * @param {number} draftId - Draft ID
 * @param {number} merchantId - Merchant ID
 * @returns {Promise<Object|null>} Draft or null if not found
 */
exports.getDraftById = async (draftId, merchantId) => {
  try {
    const draft = await ProductDraft.findOne({
      where: {
        id: draftId,
        merchant_id: merchantId,
        deleted_at: null
      },
      include: [
        {
          model: MenuInventory,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'price', 'thumbnail_url']
        }
      ]
    });
    
    return draft;
  } catch (error) {
    logger.error(`Error fetching draft ${draftId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch product draft', 500);
  }
};

/**
 * Update a draft
 * @param {Object} params - Parameters for updating a draft
 * @param {number} params.draftId - Draft ID
 * @param {number} params.merchantId - Merchant ID
 * @param {Object} params.draftData - Updated draft data
 * @param {number} params.updatedBy - User ID of updater
 * @returns {Promise<Object|null>} Updated draft or null if not found
 */
exports.updateDraft = async ({ draftId, merchantId, draftData, updatedBy }) => {
  const transaction = await sequelize.transaction();
  
  try {
    const draft = await ProductDraft.findOne({
      where: {
        id: draftId,
        merchant_id: merchantId,
        deleted_at: null
      },
      transaction
    });
    
    if (!draft) {
      await transaction.rollback();
      return null;
    }
    
    if (draft.status === 'published') {
      await transaction.rollback();
      throw new AppError('Cannot update a published draft', 400);
    }
    
    // Update draft data
    draftData.updated_by = updatedBy;
    draftData.updated_at = new Date();
    
    await draft.update(draftData, { transaction });
    
    await transaction.commit();
    return draft;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error updating draft ${draftId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to update product draft', 500);
  }
};

/**
 * Delete a draft
 * @param {number} draftId - Draft ID
 * @param {number} merchantId - Merchant ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
exports.deleteDraft = async (draftId, merchantId) => {
  const transaction = await sequelize.transaction();
  
  try {
    const draft = await ProductDraft.findOne({
      where: {
        id: draftId,
        merchant_id: merchantId,
        deleted_at: null
      },
      transaction
    });
    
    if (!draft) {
      await transaction.rollback();
      return false;
    }
    
    // Soft delete the draft
    await draft.update({ 
      deleted_at: new Date(),
      status: 'deleted'
    }, { transaction });
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error deleting draft ${draftId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to delete product draft', 500);
  }
};

/**
 * Publish a draft to create/update a product
 * @param {Object} params - Parameters for publishing a draft
 * @param {number} params.draftId - Draft ID
 * @param {number} params.merchantId - Merchant ID
 * @param {number} params.publishedBy - User ID of publisher
 * @returns {Promise<Object>} Product and updated draft
 */
exports.publishDraft = async ({ draftId, merchantId, publishedBy }) => {
  const transaction = await sequelize.transaction();
  
  try {
    const draft = await ProductDraft.findOne({
      where: {
        id: draftId,
        merchant_id: merchantId,
        deleted_at: null
      },
      transaction
    });
    
    if (!draft) {
      await transaction.rollback();
      throw new AppError('Draft not found', 404);
    }
    
    // Update draft status
    await draft.update({
      status: 'published',
      published_at: new Date(),
      published_by: publishedBy
    }, { transaction });
    
    let product;
    
    // Create or update product based on draft data
    if (draft.menu_item_id) {
      // Update existing product
      product = await MenuInventory.findByPk(draft.menu_item_id, { transaction });
      
      if (!product) {
        await transaction.rollback();
        throw new AppError('Product not found', 404);
      }
      
      // Apply draft changes to product
      const productData = prepareProductDataFromDraft(draft);
      productData.updated_by = publishedBy;
      
      await product.update(productData, { transaction });
    } else {
      // Create new product
      const productData = prepareProductDataFromDraft(draft);
      productData.created_by = publishedBy;
      
      product = await MenuInventory.create(productData, { transaction });
      
      // Update draft with product ID
      await draft.update({
        menu_item_id: product.id
      }, { transaction });
    }
    
    await transaction.commit();
    
    return { product, draft };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error publishing draft ${draftId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to publish product draft', 500);
  }
};

/**
 * Generate a preview of the draft
 * @param {number} draftId - Draft ID
 * @param {number} merchantId - Merchant ID
 * @returns {Promise<Object|null>} Preview data or null if not found
 */
exports.generatePreview = async (draftId, merchantId) => {
  try {
    const draft = await ProductDraft.findOne({
      where: {
        id: draftId,
        merchant_id: merchantId,
        deleted_at: null
      },
      include: [
        {
          model: MenuInventory,
          as: 'product',
          attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] }
        }
      ]
    });
    
    if (!draft) {
      return null;
    }
    
    // Create a preview object that simulates what the product would look like if published
    const previewData = prepareProductDataFromDraft(draft);
    
    // Add additional preview metadata
    const preview = {
      draft_id: draft.id,
      product_id: draft.menu_item_id,
      is_new_product: !draft.menu_item_id,
      draft_version: draft.version,
      draft_created_at: draft.created_at,
      draft_updated_at: draft.updated_at,
      preview_data: previewData
    };
    
    // If updating an existing product, add comparison data
    if (draft.product) {
      preview.current_product = draft.product;
      preview.changes = generateChangesReport(draft.product, previewData);
    }
    
    return preview;
  } catch (error) {
    logger.error(`Error generating preview for draft ${draftId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to generate draft preview', 500);
  }
};

/**
 * Compare two drafts or a draft with the published product
 * @param {Object} params - Parameters for comparison
 * @param {number} params.merchantId - Merchant ID
 * @param {number} params.draftId1 - First draft ID
 * @param {number|null} params.draftId2 - Second draft ID (optional)
 * @param {number|null} params.productId - Product ID (optional, alternative to draftId2)
 * @returns {Promise<Object>} Comparison results
 */
exports.compareDrafts = async ({ merchantId, draftId1, draftId2, productId }) => {
  try {
    // Get first draft
    const draft1 = await ProductDraft.findOne({
      where: {
        id: draftId1,
        merchant_id: merchantId,
        deleted_at: null
      }
    });
    
    if (!draft1) {
      throw new AppError('First draft not found', 404);
    }
    
    let item1 = prepareProductDataFromDraft(draft1);
    let item2;
    let item2Type;
    
    // Get second item (draft or product)
    if (draftId2) {
      const draft2 = await ProductDraft.findOne({
        where: {
          id: draftId2,
          merchant_id: merchantId,
          deleted_at: null
        }
      });
      
      if (!draft2) {
        throw new AppError('Second draft not found', 404);
      }
      
      item2 = prepareProductDataFromDraft(draft2);
      item2Type = 'draft';
    } else if (productId) {
      const product = await MenuInventory.findOne({
        where: {
          id: productId,
          merchant_id: merchantId,
          deleted_at: null
        }
      });
      
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      
      item2 = product.toJSON();
      item2Type = 'product';
    }
    
    // Generate comparison
    const comparison = {
      item1: {
        type: 'draft',
        id: draft1.id,
        version: draft1.version,
        created_at: draft1.created_at,
        data: item1
      },
      item2: {
        type: item2Type,
        id: draftId2 || productId,
        version: item2Type === 'draft' ? item2.version : 'published',
        created_at: item2.created_at,
        data: item2
      },
      differences: generateChangesReport(item1, item2)
    };
    
    return comparison;
  } catch (error) {
    logger.error(`Error comparing drafts for merchant ${merchantId}:`, error);
    throw new AppError('Failed to compare drafts', 500);
  }
};

/**
 * Get all draft versions for a product
 * @param {number} productId - Product ID
 * @param {number} merchantId - Merchant ID
 * @returns {Promise<Array>} Draft versions
 */
exports.getProductDrafts = async (productId, merchantId) => {
  try {
    const drafts = await ProductDraft.findAll({
      where: {
        menu_item_id: productId,
        merchant_id: merchantId,
        deleted_at: null
      },
      order: [['version', 'DESC']]
    });
    
    return drafts;
  } catch (error) {
    logger.error(`Error fetching drafts for product ${productId}, merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch product drafts', 500);
  }
};

/**
 * Create a new draft version from an existing product
 * @param {Object} params - Parameters
 * @param {number} params.merchantId - Merchant ID
 * @param {number} params.productId - Product ID
 * @param {Object} params.draftData - Additional draft data (overrides)
 * @param {number} params.createdBy - User ID of creator
 * @returns {Promise<Object>} Created draft
 */
exports.createDraftFromProduct = async ({ merchantId, productId, draftData = {}, createdBy }) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get the product
    const product = await MenuInventory.findOne({
      where: {
        id: productId,
        merchant_id: merchantId,
        deleted_at: null
      },
      transaction
    });
    
    if (!product) {
      await transaction.rollback();
      throw new AppError('Product not found', 404);
    }
    
    // Get the next version number
    const version = await getNextVersion(productId, merchantId);
    
    // Create a draft based on the product
    const productData = product.toJSON();
    
    // Remove non-draft fields
    delete productData.id;
    delete productData.created_at;
    delete productData.updated_at;
    delete productData.deleted_at;
    delete productData.created_by;
    delete productData.updated_by;
    
    // Create the draft with product data + overrides
    const newDraft = await ProductDraft.create({
      ...productData,
      ...draftData,
      menu_item_id: productId,
      merchant_id: merchantId,
      created_by: createdBy,
      status: 'draft',
      version
    }, { transaction });
    
    await transaction.commit();
    return newDraft;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error creating draft from product ${productId} for merchant ${merchantId}:`, error);
    throw new AppError('Failed to create draft from product', 500);
  }
};

/**
 * Get the next version number for a product draft
 * @param {number|null} productId - Product ID
 * @param {number} merchantId - Merchant ID
 * @returns {Promise<number>} Next version number
 */
async function getNextVersion(productId, merchantId) {
  try {
    let version = 1;
    
    if (productId) {
      // Find the highest version for this product
      const highestVersion = await ProductDraft.findOne({
        where: {
          menu_item_id: productId,
          merchant_id: merchantId
        },
        order: [['version', 'DESC']],
        attributes: ['version']
      });
      
      if (highestVersion) {
        version = highestVersion.version + 1;
      }
    } else {
      // For new products, start at version 1
      version = 1;
    }
    
    return version;
  } catch (error) {
    logger.error(`Error determining next version for product ${productId}, merchant ${merchantId}:`, error);
    return 1; // Default to 1 if there's an error
  }
}

/**
 * Prepare product data from draft data
 * @param {Object} draft - Draft object
 * @returns {Object} Product data
 */
function prepareProductDataFromDraft(draft) {
  const draftData = draft.toJSON ? draft.toJSON() : { ...draft };
  
  // Fields to exclude from product data
  const excludeFields = [
    'id', 'status', 'version', 'published_at', 'published_by',
    'created_at', 'updated_at', 'deleted_at'
  ];
  
  const productData = {};
  
  // Copy relevant fields to product data
  Object.keys(draftData).forEach(key => {
    if (!excludeFields.includes(key)) {
      productData[key] = draftData[key];
    }
  });
  
  return productData;
}

/**
 * Generate a report of changes between two objects
 * @param {Object} original - Original object
 * @param {Object} updated - Updated object
 * @returns {Object} Changes report
 */
function generateChangesReport(original, updated) {
  const changes = {};
  const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
  
  allKeys.forEach(key => {
    // Skip internal fields
    if (['id', 'created_at', 'updated_at', 'deleted_at'].includes(key)) {
      return;
    }
    
    const originalValue = original[key];
    const updatedValue = updated[key];
    
    // Check if values are different
    if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
      changes[key] = {
        old: originalValue,
        new: updatedValue
      };
    }
  });
  
  return changes;
}