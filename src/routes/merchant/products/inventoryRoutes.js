'use strict';
const express = require('express');
const inventoryController = require('@controllers/merchant/products/inventoryController');
const inventoryMiddleware = require('@middleware/inventoryMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router({ mergeParams: true });

router.use(inventoryMiddleware.protect, inventoryMiddleware.restrictToMerchant);

// Inventory levels (branch optional)
router.get(
  '/branch/:branchId?',
  inventoryMiddleware.validateBranchOwnership,
  inventoryController.getInventoryLevels
);

// Update single product
router.patch(
  '/products/:productId',
  inventoryMiddleware.validateProductOwnership,
  inventoryController.updateStockLevel
);

// Bulk update (branch optional)
router.post(
  '/bulk',
  inventoryController.bulkUpdateInventory
);

// Stats (branch optional)
router.get(
  '/stats',
  inventoryController.getInventoryStatistics
);

// Branch-specific bulk update
router.post(
  '/branch/:branchId/bulk',
  inventoryMiddleware.validateBranchOwnership,
  inventoryController.bulkUpdateInventory
);

// Branch-specific stats
router.get(
  '/branch/:branchId/stats',
  inventoryMiddleware.validateBranchOwnership,
  inventoryController.getInventoryStatistics
);

router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    logger.info(`Inventory route registered: ${r.route.path} [${Object.keys(r.route.methods).join(', ')}]`);
  }
});

module.exports = router;