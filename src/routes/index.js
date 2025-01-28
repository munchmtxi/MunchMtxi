// src/routes/index.js
const express = require('express');
const authRoutes = require('./authRoutes');
const passwordRoutes = require('./passwordRoutes');
const notificationRoutes = require('./notificationRoutes');
const deviceRoutes = require('./deviceRoutes');
const twoFactorRoutes = require('./2faRoutes');

const router = express.Router();

// Route Definitions
router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);
router.use('/notifications', notificationRoutes);
router.use('/devices', deviceRoutes);
router.use('/2fa', twoFactorRoutes);

module.exports = router;
