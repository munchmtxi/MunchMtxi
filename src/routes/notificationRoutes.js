// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('@controllers/notificationController');
const { authenticate, authorizeRoles } = require('@middleware/authMiddleware');

// Basic route validation first
if (!notificationController || !notificationController.sendWhatsAppTemplate) {
  console.error('NotificationController loading error:', {
    controller: !!notificationController,
    methods: notificationController ? Object.keys(notificationController) : null
  });
}

// API Routes
router.post('/whatsapp/template',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendWhatsAppTemplate
);

router.post('/email/template',
  authenticate,
  authorizeRoles(['admin', 'merchant']),
  notificationController.sendEmailTemplate
);

router.post('/email/custom',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendCustomEmail
);

router.get('/templates',
  authenticate,
  notificationController.getTemplates
);

router.get('/logs',
  authenticate,
  authorizeRoles('admin'),
  notificationController.getNotificationLogs
);

router.get('/stats',
  authenticate,
  authorizeRoles('admin'),
  notificationController.getNotificationStats
);

router.post('/retry',
  authenticate,
  authorizeRoles('admin'),
  notificationController.retryFailedNotifications
);

module.exports = router;