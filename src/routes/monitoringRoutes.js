// src/routes/monitoringRoutes.js
const express = require('express');
const router = express.Router();
const { PerformanceMonitor, logger } = require('../utils/logger');
const { authMiddleware } = require('../middleware/authMiddleware');

// Middleware to ensure only admin access
const ensureAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Performance Metrics
router.get('/metrics', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const metrics = PerformanceMonitor.getMetricsSummary();
    res.json({
      status: 'success',
      timestamp: new Date(),
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching metrics', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// System Health Check
router.get('/health', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const health = await req.app.locals.healthMonitor.checkSystemHealth();
    res.json({
      status: 'success',
      timestamp: new Date(),
      data: health
    });
  } catch (error) {
    logger.error('Error checking system health', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Error Rates and Types
router.get('/errors', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h'; // Default to last 24 hours
    const errors = await getErrorStats(timeframe);
    res.json({
      status: 'success',
      timestamp: new Date(),
      timeframe,
      data: errors
    });
  } catch (error) {
    logger.error('Error fetching error statistics', error);
    res.status(500).json({ error: 'Failed to fetch error statistics' });
  }
});

// Active Users and Sessions
router.get('/active-users', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const activeUsers = await getActiveUserStats();
    res.json({
      status: 'success',
      timestamp: new Date(),
      data: activeUsers
    });
  } catch (error) {
    logger.error('Error fetching active user statistics', error);
    res.status(500).json({ error: 'Failed to fetch active user statistics' });
  }
});

// Resource Usage
router.get('/resources', authMiddleware, ensureAdmin, async (req, res) => {
  try {
    const resources = await getResourceUsage();
    res.json({
      status: 'success',
      timestamp: new Date(),
      data: resources
    });
  } catch (error) {
    logger.error('Error fetching resource usage', error);
    res.status(500).json({ error: 'Failed to fetch resource usage' });
  }
});

// Helper Functions
async function getErrorStats(timeframe) {
  // Implementation for error statistics
  return {
    total: 0,
    byType: {},
    byEndpoint: {},
    trend: []
  };
}

async function getActiveUserStats() {
  // Implementation for active user statistics
  return {
    currentActive: 0,
    peak24h: 0,
    byPlatform: {},
    byRegion: {}
  };
}

async function getResourceUsage() {
  const used = process.memoryUsage();
  return {
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100
    },
    cpu: process.cpuUsage(),
    uptime: process.uptime()
  };
}

// Log access to monitoring endpoints
router.use((req, res, next) => {
  logger.info('Monitoring endpoint accessed', {
    path: req.path,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date()
  });
  next();
});

module.exports = router;