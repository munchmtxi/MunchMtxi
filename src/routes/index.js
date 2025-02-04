// src/routes/index.js
const express = require('express');
const authRoutes = require('@routes/authRoutes');
const passwordRoutes = require('@routes/passwordRoutes');
const notificationRoutes = require('@routes/notificationRoutes');
const deviceRoutes = require('@routes/deviceRoutes');
const twoFaRoutes = require('@routes/2faRoutes');

const router = express.Router();

// Route Definitions
router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);
router.use('/notifications', notificationRoutes);
router.use('/devices', deviceRoutes);
router.use('/2fa', twoFactorRoutes);

module.exports = router;
