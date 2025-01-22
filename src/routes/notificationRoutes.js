const express = require('express');
const { sendNotification } = require('../controllers/notificationController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/whatsapp', authenticate, authorizeRoles('admin'), sendNotification);

module.exports = router;