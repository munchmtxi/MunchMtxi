// src/routes/merchantRoutes/profileRoutes/merchantMetricsRoutes.js
const express = require('express');
const { protect, hasMerchantPermission } = require('@middleware/authMiddleware');
const merchantMetricsMiddleware = require('@middleware/merchantMetricsMiddleware');
const { 
  getMetrics,
  getRevenueMetrics,
  getOrderMetrics,
  getRatingMetrics,
  getMetricsOverview,
  getMetricsComparison,
  recalculateMetrics
} = require('@controllers/merchantControllers/profileControllers/performanceMetricsController');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(merchantMetricsMiddleware.handle);

// Performance Metrics Routes
router.get('/performance', hasMerchantPermission('VIEW_METRICS'), getMetrics);
router.get('/revenue', hasMerchantPermission('VIEW_METRICS'), getRevenueMetrics);
router.get('/orders', hasMerchantPermission('VIEW_METRICS'), getOrderMetrics);
router.get('/ratings', hasMerchantPermission('VIEW_METRICS'), getRatingMetrics);
router.get('/overview', hasMerchantPermission('VIEW_METRICS'), getMetricsOverview);
router.get('/comparison', hasMerchantPermission('VIEW_METRICS'), getMetricsComparison);
router.post('/recalculate', hasMerchantPermission(['MANAGE_METRICS', 'ADMIN']), recalculateMetrics);

module.exports = router;