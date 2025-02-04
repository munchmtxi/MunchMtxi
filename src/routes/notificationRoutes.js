const express = require('express');
const notificationController = require('@controllers/notificationController');
const authMiddleware = require('@middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoints for sending and managing notifications
 */

router.post('/whatsapp', authenticate, authorizeRoles('admin'), sendWhatsAppTemplate);

// Add similar Swagger comments for other notification endpoints...

module.exports = router;