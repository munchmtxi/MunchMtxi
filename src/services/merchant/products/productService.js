// src/services/merchant/productService.js
'use strict';
const { 
  MenuInventory, 
  ProductModifier, 
  ProductAttribute, 
  ProductAuditLog, 
  ProductDraft 
} = require('@models');
const db = require('@models');
const { imageHandler } = require('@utils/imageHandler');
const { logger } = require('@utils/logger');
const { AppError } = require('@utils/AppError');
const { Op } = require('sequelize');
const Papa = require('papaparse');
const xlsx = require('xlsx');

class ProductService {
  MEASUREMENT_UNITS = ['piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'];
  AVAILABILITY_STATUSES = ['in-stock', 'out-of-stock', 'pre-order'];
  MODIFIER_TYPES = ['size', 'spiciness', 'extras', 'toppings', 'sauces', 'cooking_preference', 'temperature', 'side_choices', 'dressings'];
  ATTRIBUTE_TYPES = ['vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 'organic', 'locally_sourced', 'allergen_free', 'non_gmo', 'sustainable', 'fair_trade', 'low_calorie'];

  async createProduct(productData, merchantId, branchId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      this._validateRequiredFields(productData);

      const processedImages = await this._processImages(productData.images, merchantId);

      const baseProductData = {
        merchant_id: merchantId,
        branch_id: branchId || null,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id || null,
        images: processedImages,
        measurement_unit: this._validateEnum(productData.measurement_unit, this.MEASUREMENT_UNITS, 'piece'),
        availability_status: this._validateEnum(productData.availability_status, this.AVAILABILITY_STATUSES, 'in-stock'),
        is_published: productData.is_published || false,
        created_by: userId,
        updated_by: userId
      };

      const product = await MenuInventory.create(baseProductData, { transaction });

      if (productData.modifiers?.length) {
        await this._createModifiers(product.id, productData.modifiers, transaction);
      }

      if (productData.attributes?.length) {
        await this._createAttributes(product.id, productData.attributes, transaction);
      }

      await this._logAudit(product.id, userId, 'create', baseProductData, transaction);

      await transaction.commit();
      logger.info('🛍️ Product created', { productId: product.id, merchantId });
      return await this.getProductById(product.id);
    } catch (error) {
      await transaction.rollback();
      logger.error('🚨 Product creation failed', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to create product', 500);
    }
  }

  async createDraft(productData, merchantId, userId) {
    try {
      const draft = await ProductDraft.create({
        merchant_id: merchantId,
        created_by: userId,
        draft_data: productData,
        status: 'draft'
      });
      logger.info('📝 Product draft created', { draftId: draft.id, merchantId });
      return draft;
    } catch (error) {
      logger.error('🚨 Draft creation failed', { error: error.message, merchantId });
      throw new AppError('Failed to create draft: ' + error.message, 400);
    }
  }

  async publishDraft(draftId, merchantId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      const draft = await ProductDraft.findByPk(draftId);
      if (!draft || draft.merchant_id !== merchantId) {
        throw new AppError('Draft not found or unauthorized', 404);
      }

      const product = await this.createProduct(draft.draft_data, merchantId, draft.draft_data.branch_id, userId);
      await draft.update({ status: 'published', menu_item_id: product.id }, { transaction });

      await transaction.commit();
      logger.info('📢 Draft published', { draftId, productId: product.id, merchantId });
      return product;
    } catch (error) {
      await transaction.rollback();
      logger.error('🚨 Draft publishing failed', { draftId, error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to publish draft', 500);
    }
  }

  async updateProduct(productId, updateData, merchantId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      const product = await MenuInventory.findByPk(productId);
      if (!product || product.merchant_id !== merchantId) {
        throw new AppError('Product not found or unauthorized', 404);
      }

      if (updateData.images) {
        updateData.images = await this._processImages(updateData.images, merchantId);
      }

      const oldData = product.toJSON();
      updateData.updated_by = userId;
      await product.update(updateData, { transaction });

      if (updateData.modifiers) {
        await ProductModifier.destroy({ where: { menu_item_id: productId }, transaction });
        await this._createModifiers(productId, updateData.modifiers, transaction);
      }

      if (updateData.attributes) {
        await ProductAttribute.destroy({ where: { menu_item_id: productId }, transaction });
        await this._createAttributes(productId, updateData.attributes, transaction);
      }

      await this._logAudit(productId, userId, 'update', { before: oldData, after: updateData }, transaction);

      await transaction.commit();
      logger.info('✏️ Product updated', { productId, merchantId });
      return await this.getProductById(productId);
    } catch (error) {
      await transaction.rollback();
      logger.error('🚨 Product update failed', { productId, error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update product', 500);
    }
  }

  async deleteProduct(productId, merchantId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      const product = await MenuInventory.findByPk(productId);
      if (!product || product.merchant_id !== merchantId) {
        throw new AppError('Product not found or unauthorized', 404);
      }

      await ProductModifier.destroy({ where: { menu_item_id: productId }, transaction });
      await ProductAttribute.destroy({ where: { menu_item_id: productId }, transaction });
      await ProductAuditLog.create(
        { menu_item_id: productId, user_id: userId, action: 'delete', changes: product.toJSON() },
        { transaction }
      );
      await product.destroy({ transaction });

      await transaction.commit();
      logger.info('🗑️ Product deleted', { productId, merchantId });
    } catch (error) {
      await transaction.rollback();
      logger.error('🚨 Product deletion failed', { productId, error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to delete product', 500);
    }
  }

  async processBulkUpload(file, format, merchantId, userId) {
    const transaction = await db.sequelize.transaction();
    try {
      let products;
      if (format === 'csv') {
        products = await this._parseCSV(file);
      } else if (format === 'xlsx') {
        products = await this._parseExcel(file);
      } else {
        throw new AppError('Unsupported file format', 400);
      }

      const createdProducts = [];
      for (const productData of products) {
        const product = await this.createProduct(productData, merchantId, productData.branch_id, userId);
        createdProducts.push(product);
      }

      await transaction.commit();
      logger.info('📤 Bulk upload processed', { count: createdProducts.length, merchantId });
      return createdProducts;
    } catch (error) {
      await transaction.rollback();
      logger.error('🚨 Bulk upload failed', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to process bulk upload', 500);
    }
  }

  async getProductById(productId) {
    const product = await MenuInventory.findByPk(productId, {
      include: [
        { model: ProductModifier, as: 'modifiers' },
        { model: ProductAttribute, as: 'attributes' }
      ]
    });
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  }

  async getProducts(merchantId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      branch_id,
      category_id,
      status,
      search,
      published,
      priceRange
    } = filters;

    const where = { merchant_id: merchantId };
    if (branch_id) where.branch_id = branch_id;
    if (category_id) where.category_id = category_id;
    if (status) where.availability_status = status;
    if (published !== undefined) where.is_published = published;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (priceRange) {
      where.price = { [Op.between]: [priceRange.min, priceRange.max] };
    }

    const products = await MenuInventory.findAndCountAll({
      where,
      include: [
        { model: ProductModifier, as: 'modifiers' },
        { model: ProductAttribute, as: 'attributes' }
      ],
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']]
    });

    return {
      items: products.rows,
      total: products.count,
      page: parseInt(page),
      totalPages: Math.ceil(products.count / limit)
    };
  }

  // Private Helper Methods
  async _createModifiers(productId, modifiers, transaction) {
    const modifierRecords = modifiers.map(modifier => ({
      menu_item_id: productId,
      type: this._validateEnum(modifier.type, this.MODIFIER_TYPES),
      name: modifier.name,
      price_adjustment: modifier.price_adjustment || 0,
      is_required: modifier.is_required || false
    }));
    await ProductModifier.bulkCreate(modifierRecords, { transaction });
  }

  async _createAttributes(productId, attributes, transaction) {
    const attributeRecords = attributes.map(attribute => ({
      menu_item_id: productId,
      type: this._validateEnum(attribute.type, this.ATTRIBUTE_TYPES),
      value: attribute.value !== undefined ? attribute.value : true
    }));
    await ProductAttribute.bulkCreate(attributeRecords, { transaction });
  }

  async _logAudit(productId, userId, action, changes, transaction) {
    await ProductAuditLog.create({
      menu_item_id: productId,
      user_id: userId,
      action,
      changes
    }, { transaction });
  }

  async _processImages(images, merchantId) {
    if (!images?.length) return [];
    return await Promise.all(
      images.map(async (image, index) => 
        await imageHandler.processAndSave(image, merchantId, `product-${index}`)
      )
    );
  }

  async _parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(new AppError('Failed to parse CSV: ' + error.message, 400))
      });
    });
  }

  async _parseExcel(file) {
    const workbook = xlsx.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }

  _validateRequiredFields(data) {
    const required = ['name', 'price'];
    const missing = required.filter(field => !data[field]);
    if (missing.length) {
      throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
    }
  }

  _validateEnum(value, allowedValues, defaultValue = null) {
    if (!value) return defaultValue;
    if (!allowedValues.includes(value)) {
      throw new AppError(`Invalid value: ${value}. Allowed: ${allowedValues.join(', ')}`, 400);
    }
    return value;
  }
}

module.exports = new ProductService();