const express = require('express');
const router = express.Router();
const notificationController = require('@controllers/notificationController');
const { authenticate, authorizeRoles } = require('@middleware/authMiddleware');

// Route validation to ensure controller is loaded correctly
if (!notificationController || !notificationController.sendWhatsAppTemplate) {
  console.error('NotificationController loading error:', {
    controller: !!notificationController,
    methods: notificationController ? Object.keys(notificationController) : null
  });
  throw new Error('Failed to load notificationController');
}

/**
 * Notification Routes
 * All routes require authentication; specific roles are authorized as needed
 */

// Send WhatsApp template notification (admin only)
router.post(
  '/whatsapp/template',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendWhatsAppTemplate
);

// Send custom WhatsApp message (admin only)
router.post(
  '/whatsapp/custom',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendCustomWhatsApp
);

// Send Email template notification (admin and merchant allowed)
router.post(
  '/email/template',
  authenticate,
  authorizeRoles(['admin', 'merchant']),
  notificationController.sendEmailTemplate
);

// Send custom Email (admin only)
router.post(
  '/email/custom',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendCustomEmail
);

// Send SMS notification (admin and merchant allowed)
router.post(
  '/sms',
  authenticate,
  authorizeRoles(['admin', 'merchant']),
  notificationController.sendSMSNotification
);

// Send bulk notifications (admin only, requires SEND_BULK_NOTIFICATIONS permission)
router.post(
  '/bulk',
  authenticate,
  authorizeRoles('admin'),
  notificationController.sendBulkNotifications
);

// Get notification templates (authenticated users)
router.get(
  '/templates',
  authenticate,
  notificationController.getTemplates
);

// Get notification logs (admin only)
router.get(
  '/logs',
  authenticate,
  authorizeRoles('admin'),
  notificationController.getNotificationLogs
);

// Get notification statistics (admin only)
router.get(
  '/stats',
  authenticate,
  authorizeRoles('admin'),
  notificationController.getNotificationStats
);

// Retry failed notifications (admin only, requires RETRY_NOTIFICATIONS permission)
router.post(
  '/retry',
  authenticate,
  authorizeRoles('admin'),
  notificationController.retryFailedNotifications
);

// Get user-specific notifications (authenticated users)
router.get(
  '/user',
  authenticate,
  notificationController.getNotifications
);

module.exports = router;