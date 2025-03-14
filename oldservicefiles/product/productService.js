// src/services/merchantServices/productServices/productService.js

const { 
    MenuInventory, 
    ProductModifier, 
    ProductAttribute, 
    ProductAuditLog, 
    ProductDraft 
  } = require('@models');
  const { imageHandler } = require('@utils/imageHandler');
  const { AppError } = require('@utils/AppError');
  const { Op } = require('sequelize');
  const sequelize = require('sequelize');
  const Papa = require('papaparse');
  const xlsx = require('xlsx');
  
  class ProductService {
    // Constants
    MEASUREMENT_UNITS = ['piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'];
    AVAILABILITY_STATUSES = ['in-stock', 'out-of-stock', 'pre-order'];
    DISCOUNT_TYPES = ['percentage', 'flat', 'bogo', 'seasonal', 'loyalty', 'bulk_discount', 'early_bird', 'clearance'];
    MODIFIER_TYPES = ['size', 'spiciness', 'extras', 'toppings', 'sauces', 'cooking_preference', 'temperature', 'side_choices', 'dressings'];
    ATTRIBUTE_TYPES = ['vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 'organic', 'locally_sourced', 'allergen_free', 'non_gmo', 'sustainable', 'fair_trade', 'low_calorie'];
  
    /**
     * Create a new product with all associated data
     */
    async createProduct(productData, merchantId, userId) {
      const transaction = await sequelize.transaction();
      try {
        // Validate required fields
        this._validateRequiredFields(productData);
        
        // Process and validate images
        const processedImages = await this._processImages(productData.images);
  
        // Prepare base product data
        const baseProductData = {
          merchant_id: merchantId,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          images: processedImages,
          measurement_unit: this._validateEnum(productData.measurement_unit, this.MEASUREMENT_UNITS),
          availability_status: productData.availability_status || 'in-stock',
          is_published: productData.is_published || false
        };
  
        // Create base product
        const product = await MenuInventory.create(baseProductData, { transaction });
  
        // Handle modifiers
        if (productData.modifiers?.length) {
          await this._createModifiers(product.id, productData.modifiers, transaction);
        }
  
        // Handle attributes
        if (productData.attributes?.length) {
          await this._createAttributes(product.id, productData.attributes, transaction);
        }
  
        // Create audit log
        await this._createAuditLog({
          menu_item_id: product.id,
          user_id: userId,
          action: 'create',
          changes: baseProductData
        }, transaction);
  
        await transaction.commit();
        return await this.getProductById(product.id);
  
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Create draft product
     */
    async createDraft(productData, merchantId, userId) {
      try {
        const draft = await ProductDraft.create({
          merchant_id: merchantId,
          created_by: userId,
          draft_data: productData,
          status: 'draft'
        });
  
        return draft;
      } catch (error) {
        throw new AppError('Failed to create draft: ' + error.message, 400);
      }
    }
  
    /**
     * Publish draft to live product
     */
    async publishDraft(draftId, userId) {
      const transaction = await sequelize.transaction();
      try {
        const draft = await ProductDraft.findByPk(draftId);
        if (!draft) throw new AppError('Draft not found', 404);
  
        const product = await this.createProduct(draft.draft_data, draft.merchant_id, userId);
        await draft.update({ status: 'published' }, { transaction });
  
        await transaction.commit();
        return product;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Update existing product
     */
    async updateProduct(productId, updateData, userId) {
      const transaction = await sequelize.transaction();
      try {
        const product = await MenuInventory.findByPk(productId);
        if (!product) throw new AppError('Product not found', 404);
  
        // Process images if new ones are provided
        if (updateData.images) {
          updateData.images = await this._processImages(updateData.images);
        }
  
        // Update base product
        const oldData = product.toJSON();
        await product.update(updateData, { transaction });
  
        // Update modifiers if provided
        if (updateData.modifiers) {
          await ProductModifier.destroy({ 
            where: { menu_item_id: productId }, 
            transaction 
          });
          await this._createModifiers(productId, updateData.modifiers, transaction);
        }
  
        // Update attributes if provided
        if (updateData.attributes) {
          await ProductAttribute.destroy({ 
            where: { menu_item_id: productId }, 
            transaction 
          });
          await this._createAttributes(productId, updateData.attributes, transaction);
        }
  
        // Log changes
        await this._createAuditLog({
          menu_item_id: productId,
          user_id: userId,
          action: 'update',
          changes: { before: oldData, after: updateData }
        }, transaction);
  
        await transaction.commit();
        return await this.getProductById(productId);
  
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Process bulk upload from CSV or JSON
     */
    async processBulkUpload(file, format, merchantId, userId) {
      const transaction = await sequelize.transaction();
      try {
        let products;
  
        if (format === 'csv') {
          products = await this._parseCSV(file);
        } else if (format === 'json') {
          products = JSON.parse(file);
        } else {
          throw new AppError('Unsupported file format', 400);
        }
  
        const createdProducts = [];
        for (const productData of products) {
          const product = await this.createProduct(productData, merchantId, userId);
          createdProducts.push(product);
        }
  
        await transaction.commit();
        return createdProducts;
  
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Get product by ID with all associations
     */
    async getProductById(productId) {
      return await MenuInventory.findByPk(productId, {
        include: [
          {
            model: ProductModifier,
            as: 'modifiers',
            attributes: ['id', 'type', 'name', 'price_adjustment', 'is_required']
          },
          {
            model: ProductAttribute,
            as: 'attributes',
            attributes: ['id', 'type', 'value']
          }
        ]
      });
    }
  
    /**
     * Get products with filtering and pagination
     */
    async getProducts(merchantId, filters = {}) {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        search,
        published,
        attributes,
        priceRange
      } = filters;
  
      const where = { merchant_id: merchantId };
  
      // Apply filters
      if (category) where.category = category;
      if (status) where.availability_status = status;
      if (published !== undefined) where.is_published = published;
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }
      if (priceRange) {
        where.price = {
          [Op.between]: [priceRange.min, priceRange.max]
        };
      }
  
      const products = await MenuInventory.findAndCountAll({
        where,
        include: [
          {
            model: ProductModifier,
            as: 'modifiers'
          },
          {
            model: ProductAttribute,
            as: 'attributes',
            where: attributes ? { type: attributes } : undefined
          }
        ],
        limit,
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
      });
  
      return {
        items: products.rows,
        total: products.count,
        page,
        totalPages: Math.ceil(products.count / limit)
      };
    }
  
    // Private helper methods
  
    async _createModifiers(productId, modifiers, transaction) {
      const modifierRecords = modifiers.map(modifier => ({
        menu_item_id: productId,
        type: this._validateEnum(modifier.type, this.MODIFIER_TYPES),
        name: modifier.name,
        price_adjustment: modifier.price_adjustment,
        is_required: modifier.is_required || false
      }));
  
      await ProductModifier.bulkCreate(modifierRecords, { transaction });
    }
  
    async _createAttributes(productId, attributes, transaction) {
      const attributeRecords = attributes.map(attribute => ({
        menu_item_id: productId,
        type: this._validateEnum(attribute.type, this.ATTRIBUTE_TYPES),
        value: attribute.value
      }));
  
      await ProductAttribute.bulkCreate(attributeRecords, { transaction });
    }
  
    async _createAuditLog(logData, transaction) {
      await ProductAuditLog.create(logData, { transaction });
    }
  
    async _processImages(images) {
      if (!images?.length) return [];
      return await Promise.all(images.map(image => imageHandler.processProductImage(image)));
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
  
    _validateRequiredFields(data) {
      const required = ['name', 'description', 'price', 'category'];
      const missing = required.filter(field => !data[field]);
      
      if (missing.length) {
        throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
      }
    }
  
    _validateEnum(value, allowedValues) {
      if (!allowedValues.includes(value)) {
        throw new AppError(`Invalid value: ${value}. Allowed values: ${allowedValues.join(', ')}`, 400);
      }
      return value;
    }
  }
  
  module.exports = new ProductService();