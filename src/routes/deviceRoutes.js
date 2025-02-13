// src/routes/deviceRoutes.js
const express = require('express');
const { getUserDevices, removeDevice, getDeviceAnalytics } = require('@services/deviceService');
const { authenticate } = require('@middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get all devices for the authenticated user
router.get('/', async (req, res, next) => {
  try {
    const devices = await getUserDevices(req.user.id);
    res.status(200).json({ status: 'success', data: devices });
  } catch (error) {
    next(error);
  }
});

// Get device analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const analytics = await getDeviceAnalytics(startDate, endDate);
    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Remove a specific device
router.delete('/:deviceId', async (req, res, next) => {
  try {
    await removeDevice(req.user.id, req.params.deviceId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;