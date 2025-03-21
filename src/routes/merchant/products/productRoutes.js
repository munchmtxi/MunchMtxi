// src/routes/merchant/products/productRoutes.js
'use strict';
const express = require('express');
const ProductController = require('@controllers/merchant/products/productController');
const ProductMiddleware = require('@middleware/productMiddleware');
const upload = require('@config/multerConfig');

const router = express.Router();

router.post(
  '/',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductMiddleware.validateProductData,
  ProductController.createProduct
);

router.post(
  '/draft',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductMiddleware.validateProductData,
  ProductController.createDraft
);

router.post(
  '/draft/:draftId/publish',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductMiddleware.validateDraftId,
  ProductController.publishDraft
);

router.patch(
  '/:productId',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductMiddleware.validateProductId,
  ProductMiddleware.validateProductData,
  ProductController.updateProduct
);

router.post(
  '/bulk-upload',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  upload.single('file'),
  ProductMiddleware.validateBulkUpload,
  ProductController.processBulkUpload
);

router.get(
  '/:productId',
  ProductMiddleware.validateProductId,
  ProductController.getProduct
);

router.get(
  '/',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductController.getProducts
);

router.delete(
  '/:productId',
  ProductMiddleware.authenticate,
  ProductMiddleware.restrictToMerchant,
  ProductMiddleware.validateProductId,
  ProductController.deleteProduct
);

module.exports = router;