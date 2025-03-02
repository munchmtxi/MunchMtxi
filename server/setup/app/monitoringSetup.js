// server/setup/app/monitoringSetup.js
const InitMonitoring = require('@config/monitoring');
const { logger } = require('@utils/logger');

module.exports = {
  setupMonitoring: (app) => {
    const { healthMonitor } = InitMonitoring(app);
    app.locals.healthMonitor = healthMonitor;

    app.get('/health', async (req, res) => {
      try {
        const health = await healthMonitor.checkSystemHealth();
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

    logger.info('Monitoring setup complete');
    return healthMonitor;
  }
};