const express = require('express');
const deviceController = require('@controllers/deviceController');
const { authenticate } = require('@middleware/authMiddleware');
const deviceDetectionMiddleware = require('@middleware/deviceDetectionMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(deviceDetectionMiddleware);

// Get all devices for the authenticated user
router.get('/', deviceController.getUserDevices);

// Get device analytics
router.get('/analytics', deviceController.getDeviceAnalytics);

// Get device capabilities
router.get('/capabilities', deviceController.getDeviceCapabilities);

// Remove a specific device
router.delete('/:deviceId', deviceController.removeDevice);

// Track device
router.post('/track', deviceController.trackDevice);

// Update device settings
router.patch('/:deviceId/settings', deviceController.updateDeviceSettings);

module.exports = router;