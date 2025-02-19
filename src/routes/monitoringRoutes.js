// src/routes/monitoringRoutes.js
const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');

// All routes require admin authentication
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/metrics', monitoringController.getMetrics.bind(monitoringController));
router.get('/health', monitoringController.checkHealth.bind(monitoringController));
router.get('/errors', monitoringController.getErrorStats.bind(monitoringController));
router.get('/active-users', monitoringController.getActiveUsers);
router.get('/resources', monitoringController.getResourceUsage);
router.get('/api-usage', monitoringController.getApiUsage);
router.post('/api-quotas', monitoringController.setApiQuota);
router.get('/resource-analysis', monitoringController.analyzeResources);

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