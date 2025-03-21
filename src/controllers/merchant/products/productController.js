// src/controllers/merchant/products/productController.js
'use strict';
const ProductService = require('@services/merchant/products/productService'); // Adjusted path
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class ProductController {
  createProduct = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req; // req.user from middleware
    const productData = req.body;

    const product = await ProductService.createProduct(productData, merchantId, productData.branch_id, user.id);
    
    logger.info('🛍️ Product creation successful', { productId: product.id, merchantId });
    res.status(201).json({
      status: 'success',
      data: product
    });
  });

  createDraft = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req;
    const productData = req.body;

    const draft = await ProductService.createDraft(productData, merchantId, user.id);
    
    logger.info('📝 Draft creation successful', { draftId: draft.id, merchantId });
    res.status(201).json({
      status: 'success',
      data: draft
    });
  });

  publishDraft = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req;
    const { draftId } = req.params;

    const product = await ProductService.publishDraft(draftId, merchantId, user.id);
    
    logger.info('📢 Draft publishing successful', { draftId, productId: product.id, merchantId });
    res.status(200).json({
      status: 'success',
      data: product
    });
  });

  updateProduct = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req;
    const { productId } = req.params;
    const updateData = req.body;

    const product = await ProductService.updateProduct(productId, updateData, merchantId, user.id);
    
    logger.info('✏️ Product update successful', { productId, merchantId });
    res.status(200).json({
      status: 'success',
      data: product
    });
  });

  processBulkUpload = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req;
    const { format } = req.query;
    const file = req.file?.buffer;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const products = await ProductService.processBulkUpload(file, format, merchantId, user.id);
    
    logger.info('📤 Bulk upload successful', { count: products.length, merchantId });
    res.status(201).json({
      status: 'success',
      data: { count: products.length, products }
    });
  });

  getProduct = catchAsync(async (req, res, next) => {
    const { productId } = req.params;

    const product = await ProductService.getProductById(productId);
    
    logger.info('🔍 Product retrieval successful', { productId });
    res.status(200).json({
      status: 'success',
      data: product
    });
  });

  getProducts = catchAsync(async (req, res, next) => {
    const { merchantId } = req;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      branch_id: req.query.branch_id,
      category_id: req.query.category_id,
      status: req.query.status,
      search: req.query.search,
      published: req.query.published ? req.query.published === 'true' : undefined,
      priceRange: req.query.price_min && req.query.price_max ? {
        min: parseFloat(req.query.price_min),
        max: parseFloat(req.query.price_max)
      } : undefined
    };

    const result = await ProductService.getProducts(merchantId, filters);
    
    logger.info('📋 Products list successful', { merchantId, page: result.page });
    res.status(200).json({
      status: 'success',
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      }
    });
  });

  deleteProduct = catchAsync(async (req, res, next) => {
    const { merchantId, user } = req;
    const { productId } = req.params;

    await ProductService.deleteProduct(productId, merchantId, user.id);
    
    logger.info('🗑️ Product deleted', { productId, merchantId });
    res.status(204).json({ status: 'success' });
  });
}

module.exports = new ProductController();