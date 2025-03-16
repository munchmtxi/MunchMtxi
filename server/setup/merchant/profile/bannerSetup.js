'use strict';
const { logger } = require('@utils/logger');
const setupBanner = (app) => {
  const bannerRoutes = require('@routes/merchant/profile/bannerRoutes');
  app.use('/merchant/profile/banners', bannerRoutes); // No additional middleware here
  logger.info('Banner routes initialized');
};
module.exports = setupBanner;