const MonitoringRoutes = require('@routes/monitoringRoutes');
const AuthRoutes = require('@routes/authRoutes');
const TwoFaRoutes = require('@routes/2faRoutes');
const DeviceRoutes = require('@routes/deviceRoutes');
const NotificationRoutes = require('@routes/notificationRoutes');
const PasswordRoutes = require('@routes/passwordRoutes');
const GeolocationRoutes = require('@routes/geolocationRoutes');
const PaymentRoutes = require('@routes/paymentRoutes');
const PdfRoutes = require('@routes/pdfRoutes');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

module.exports = {
  setupRoutes: (app) => {
    app.use('/monitoring', MonitoringRoutes);
    app.use('/auth', AuthRoutes);
    app.use('/2fa', TwoFaRoutes);
    app.use('/devices', DeviceRoutes);
    app.use('/notifications', NotificationRoutes);
    app.use('/password', PasswordRoutes);
    app.use('/api/v1/geolocation', GeolocationRoutes);
    app.use('/api/v1/payments', PaymentRoutes);
    app.use('/api/pdf', PdfRoutes);

    app.get('/health', async (req, res) => {
      try {
        const health = await req.app.locals.healthMonitor.checkSystemHealth();
        res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          metrics: health
        });
      } catch (error) {
        logger.error({
          message: 'Health check endpoint failed',
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          context: 'healthCheck'
        });
        res.status(500).json({ status: 'error', message: 'Health check failed' });
      }
    });

    app.all('*', (req, res, next) => {
      const error = new AppError(`Route '${req.originalUrl}' not found on server`, 404);
      logger.warn({
        message: 'Unhandled route accessed',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        context: 'routeNotFound'
      });
      next(error);
    });
  }
};