// src/routes/index.js
const express = require('express');
const router = express.Router();
const notificationRoutes = require('@routes/notificationRoutes');

router.use('/notifications', notificationRoutes);

module.exports = router;