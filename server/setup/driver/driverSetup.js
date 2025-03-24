'use strict';

const express = require('express');
const { logger } = require('@utils/logger');
const driverProfileRoutes = require('@routes/driver/profile/driverProfileRoutes');

module.exports = {
  setupDriverProfile: (app) => {
    logger.info('Setting up driver profile routes...');
    const router = express.Router();

    // Mount driver profile routes
    router.use('/profile', driverProfileRoutes);

    app.use('/api/driver', router);
    logger.info('Driver profile routes mounted at /api/driver/profile');
  },
};