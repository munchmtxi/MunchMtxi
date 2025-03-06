const express = require('express');
const geolocationRoutes = require('@routes/geolocationRoutes');
const { logger } = require('@utils/logger'); // Destructure to get winston logger

module.exports = {
  setupGeolocationRoutes: (app) => {
    const router = express.Router();
    app.use('/api/v1/geolocation', geolocationRoutes(router));
    logger.info('Geolocation routes registered at /api/v1/geolocation');
  }
};