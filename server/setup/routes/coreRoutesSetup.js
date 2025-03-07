// src/routes/coreRoutesSetup.js
'use strict';
const MonitoringRoutes = require('@routes/monitoringRoutes');
const AuthRoutes = require('@routes/authRoutes');
const TwoFaRoutes = require('@routes/2faRoutes');
const DeviceRoutes = require('@routes/deviceRoutes');
const NotificationRoutes = require('@routes/notificationRoutes');
const PasswordRoutes = require('@routes/passwordRoutes');
const { setupGeolocationRoutes } = require('./geolocationRoutesSetup');
const PaymentRoutes = require('@routes/paymentRoutes');
const PdfRoutes = require('@routes/pdfRoutes');
const ExcelRoutes = require('@routes/excelRoutes');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

logger.info('File loaded: coreRoutesSetup.js');

module.exports = {
  setupCoreRoutes: (app) => {
    logger.info('Setting up core routes...');

    app.use('/monitoring', MonitoringRoutes);
    logger.info('Monitoring routes mounted');

    // Updated auth situation
    app.use('/auth', AuthRoutes);
    logger.info('Auth routes mounted at /auth (includes /register, /login, /token, /merchant/login, /merchant/logout, /register-role)');

    app.use('/2fa', TwoFaRoutes);
    logger.info('2FA routes mounted');

    app.use('/devices', DeviceRoutes);
    logger.info('Device routes mounted');

    app.use('/notifications', NotificationRoutes);
    logger.info('Notification routes mounted');

    app.use('/password', PasswordRoutes);
    logger.info('Password routes mounted');

    logger.info('Setting up geolocation routes...');
    setupGeolocationRoutes(app);
    logger.info('Geolocation routes mounted');

    app.use('/api/v1/payments', PaymentRoutes);
    logger.info('Payment routes mounted');

    app.use('/api/pdf', PdfRoutes);
    logger.info('PDF routes mounted');

    app.use('/api/excel', ExcelRoutes);
    logger.info('Excel routes mounted at /api/excel');

    app.get('/health', async (req, res) => {
      try {
        const health = await req.app.locals.healthMonitor.checkSystemHealth();
        res.status(200).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          metrics: health
        });
      } catch (error) {
        logger.error('Health check endpoint failed', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          context: 'healthCheck'
        });
        res.status(500).json({ status: 'error', message: 'Health check failed' });
      }
    });
    logger.info('Health check route mounted');

    app.all('*', (req, res, next) => {
      const error = new AppError(`Route '${req.originalUrl}' not found on server`, 404);
      logger.warn('Unhandled route accessed', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        context: 'routeNotFound'
      });
      next(error);
    });
    logger.info('Catch-all route mounted');

    logger.info('Core routes setup complete');
  }
};