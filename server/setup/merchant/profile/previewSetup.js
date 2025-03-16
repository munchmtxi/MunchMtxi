const { logger } = require('@utils/logger');
const previewRoutes = require('@routes/merchant/profile/previewRoutes');
const express = require('express');

function setupPreviewRoutes(app) {
  logger.info('Setting up preview routes at /api/v1/merchants/:merchantId/preview');
  
  // Mount the preview routes
  app.use('/api/v1/merchants/:merchantId/preview', previewRoutes);

  // Add a test route to verify params
  app.get('/api/v1/merchants/:merchantId/preview/test', (req, res) => {
    logger.info('Test route hit', { params: req.params });
    res.json({ params: req.params });
  });

  logger.info('Preview routes setup complete', {
    path: '/api/v1/merchants/:merchantId/preview',
    methods: ['POST', 'PATCH', 'DELETE', 'GET'],
  });

  logger.info('App router stack after preview setup', {
    stack: app._router.stack.map(layer => ({
      path: layer.route?.path || layer.regexp?.toString(),
      methods: layer.route?.methods || {}
    }))
  });
}

module.exports = { setupPreviewRoutes };