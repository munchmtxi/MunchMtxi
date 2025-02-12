// src/routes/monitoringRoutes.js
const express = require('express');
const router = express.Router();
const { logger, PerformanceMonitor } = require('../utils/logger');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware to ensure only admin access
const ensureAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

router.get('/metrics', authenticate, authorizeRoles('ADMIN'), (req, res) => {
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
router.get('/health', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
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
router.get('/errors', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
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
router.get('/active-users', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
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
router.get('/resources', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
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

// API Usage Metrics
router.get('/api-usage', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const healthMonitor = req.app.locals.healthMonitor;
    const usageData = {
      metrics: Object.fromEntries(healthMonitor.apiMetrics.usage),
      trends: Object.fromEntries(healthMonitor.apiMetrics.trends),
      quotas: Object.fromEntries(healthMonitor.apiMetrics.quotas)
    };
    res.json({
      status: 'success',
      timestamp: new Date(),
      data: usageData
    });
  } catch (error) {
    logger.error('Error fetching API usage metrics', error);
    res.status(500).json({ error: 'Failed to fetch API usage metrics' });
  }
});

// Set API Quotas
router.post('/api-quotas', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { endpoint, method, limit } = req.body;
    req.app.locals.healthMonitor.setQuota(endpoint, method, limit);

    res.json({
      status: 'success',
      message: 'Quota updated successfully'
    });
  } catch (error) {
    logger.error('Error setting API quota', error);
    res.status(500).json({ error: 'Failed to set API quota' });
  }
});

// Helper Functions
async function getErrorStats(timeframe) {
  // Use the actual metrics from PerformanceMonitor
  const metrics = PerformanceMonitor.getMetricsSummary();
  const endpointMetrics = metrics.endpoints;
  
  const errorStats = {
    total: 0,
    byType: {},
    byEndpoint: {},
    trend: []
  };

  // Analyze endpoint metrics for errors (status codes >= 400)
  Object.entries(endpointMetrics).forEach(([endpoint, data]) => {
    Object.entries(data.statusCodes).forEach(([statusCode, count]) => {
      if (parseInt(statusCode) >= 400) {
        errorStats.total += count;
        
        // Group by error type (4xx vs 5xx)
        const errorType = parseInt(statusCode) >= 500 ? 'server_error' : 'client_error';
        errorStats.byType[errorType] = (errorStats.byType[errorType] || 0) + count;
        
        // Group by endpoint
        errorStats.byEndpoint[endpoint] = (errorStats.byEndpoint[endpoint] || 0) + count;
      }
    });
  });

  return errorStats;
}

async function getActiveUserStats() {
  const metrics = PerformanceMonitor.getMetricsSummary();
  const endpointMetrics = metrics.endpoints;
  
  const activeStats = {
    currentActive: 0,
    peak24h: 0,
    byPlatform: {},
    byRegion: {}
  };

  // Calculate unique users across all endpoints
  const uniqueUsers = new Set();
  Object.values(endpointMetrics).forEach(endpoint => {
    activeStats.currentActive += endpoint.uniqueUsers || 0;
  });

  // You might want to add actual platform and region tracking in your 
  // PerformanceMonitor before implementing these
  activeStats.byPlatform = {
    web: activeStats.currentActive * 0.6, // Example distribution
    mobile: activeStats.currentActive * 0.4
  };

  activeStats.peak24h = Math.max(
    ...Object.values(endpointMetrics)
      .map(endpoint => endpoint.requestsPerMinute || 0)
  ) * 60; // Convert per-minute to hourly

  return activeStats;
}

async function getResourceUsage() {
  // This can stay as is since it uses process metrics directly
  const used = process.memoryUsage();
  const resourceMetrics = {
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100
    },
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    // Add performance metrics from your monitor
    performance: PerformanceMonitor.getMetricsSummary().performance
  };

  return resourceMetrics;
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