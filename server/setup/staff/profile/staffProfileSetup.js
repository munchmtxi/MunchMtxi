// server/setup/staff/profile/staffProfileSetup.js
'use strict';

const express = require('express');
const { logger } = require('@utils/logger');
const staffProfileRoutes = require('@routes/staff/profile/staffProfileRoutes');

module.exports = {
  setupStaffProfile: (app) => {
    logger.info('Setting up staff profile routes...');
    const router = express.Router();

    // Mount staff profile routes
    router.use('/profile', staffProfileRoutes);

    app.use('/api/staff', router);
    logger.info('Staff profile routes mounted at /api/staff/profile');
  },
};