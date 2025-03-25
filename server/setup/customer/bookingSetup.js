'use strict';

const express = require('express');
const bookingRoutes = require('@routes/customer/bookingRoutes');
const { logger, logApiEvent } = require('@utils/logger');

/**
 * Sets up booking-related routes and middleware for the Express app.
 * @param {express.Application} app - The Express application instance.
 */
const bookingSetup = (app) => {
    const router = express.Router();
    router.use('/bookings', bookingRoutes);
    logApiEvent('Booking routes mounted', { path: '/api/customer/bookings' });
    console.log('Booking setup executed'); // Debug log
    app.use('/api/customer', router);
  };

module.exports = bookingSetup;