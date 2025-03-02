// server/setup/routes/coreRoutesSetup.js
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

module.exports = {
  setupCoreRoutes: (app) => {
    app.get('/health', async (req, res) => {
      try {
        const health = await req.app.locals.healthMonitor.checkSystemHealth();
        res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          metrics: health
        });
      } catch (error) {
        logger.error('Health check failed:', { error: error.message });
        res.status(500).json({ status: 'error', message: 'Health check failed' });
      }
    });

    app.all('*', (req, res, next) => {
      const error = new AppError(`Route '${req.originalUrl}' not found`, 404);
      logger.warn('Unhandled route accessed:', { method: req.method, url: req.originalUrl });
      next(error);
    });

    logger.info('Core routes setup complete');
  }
};