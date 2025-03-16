// server/setup/merchant/profile/mapsSetup.js
const mapsRoutes = require('@routes/merchant/profile/mapsRoutes');
const { logger } = require('@utils/logger');

function setupMapsRoutes(app) {
  app.use('/api/v1/merchants/profile/maps', mapsRoutes);
  logger.info('Maps routes mounted at /api/v1/merchants/profile/maps');
}

module.exports = setupMapsRoutes;