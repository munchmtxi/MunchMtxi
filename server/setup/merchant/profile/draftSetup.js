// src/setup/merchant/profile/draftSetup.js
'use strict';

const draftRoutes = require('@routes/merchant/profile/draftRoutes');
const { logger } = require('@utils/logger');

const setupMerchantDraft = (app) => {
  try {
    // Mount draft routes under /api/v1/merchants/profile/drafts
    app.use('/api/v1/merchants/profile/drafts', draftRoutes);

    logger.info('Merchant draft routes setup complete', {
      routes: [
        'POST /api/v1/merchants/profile/drafts',
        'GET /api/v1/merchants/profile/drafts',
        'POST /api/v1/merchants/profile/drafts/submit'
      ]
    });
  } catch (error) {
    logger.error('Error setting up merchant draft routes', {
      message: error.message,
      stack: error.stack
    });
    throw error; // Let server.js handle the error
  }
};

module.exports = setupMerchantDraft;