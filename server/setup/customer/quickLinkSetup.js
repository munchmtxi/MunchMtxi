'use strict';

const quickLinkRoutes = require('@routes/customer/quickLinkRoutes');
const { logger } = require('@utils/logger');

module.exports = {
  /**
   * Setup Quick Link Management routes for the customer API
   * @param {Object} app - Express application instance
   */
  setupQuickLinkRoutes(app) {
    // Mount the quick link routes under /api/customer/quicklink
    app.use('/api/customer/quicklink', quickLinkRoutes);

    logger.info('Quick Link Management routes mounted at /api/customer/quicklink');
  },
};