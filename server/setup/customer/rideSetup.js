'use strict';
const rideRoutes = require('@routes/customer/rideRoutes'); 
const { logger } = require('@utils/logger');

const setupRideRoutes = (app) => {
  app.use('/api/v1/rides', rideRoutes); // ✅ Mounted correctly
  logger.info('🚗 Ride routes mounted under /api/v1/rides'); // ✅ Log matches path
};

module.exports = setupRideRoutes;
