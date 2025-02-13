// app.js

// External Modules
const Express = require('express');
const Cors = require('cors');
const Morgan = require('morgan');
const Http = require('http');
const SocketIO = require('socket.io');

// Aliased Internal Modules
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const SecurityMiddleware = require('@middleware/security');
const RequestLogger = require('@middleware/requestLogger');
const { performanceMiddleware: PerformanceMiddleware, apiUsageMiddleware: ApiUsageMiddleware } = require('@middleware/performanceMiddleware');
const { setupPassport: SetupPassport } = require('@config/passport');
const { setupSwagger: SetupSwagger } = require('@config/swagger');
const ErrorHandler = require('@middleware/errorHandler');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');

const MonitoringRoutes = require('@routes/monitoringRoutes');
const AuthRoutes = require('@routes/authRoutes');
const TwoFaRoutes = require('@routes/2faRoutes');
const DeviceRoutes = require('@routes/deviceRoutes');
const NotificationRoutes = require('@routes/notificationRoutes');
const PasswordRoutes = require('@routes/passwordRoutes');
const GeolocationRoutes = require('@routes/geolocationRoutes');
const PaymentRoutes = require('@routes/paymentRoutes');
const PdfRoutes = require('@routes/pdfRoutes');

const InitMonitoring = require('@config/monitoring');

const SMSService = require('@services/smsService');
const NotificationService = require('@services/notificationService');
const EventManager = require('@services/eventManager');

// Create Express app
const app = Express();

// Initialize monitoring system
const { healthMonitor } = InitMonitoring(app);

// Basic middleware
app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

// Morgan logger middleware
app.use(Morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim())
  }
}));

// Apply security middleware
SecurityMiddleware(app);

// Custom request logger
app.use(RequestLogger);

// Performance monitoring and API usage middleware
app.use(PerformanceMiddleware);
app.use(ApiUsageMiddleware(healthMonitor));
app.use(responseOptimizer());

// Initialize authentication
SetupPassport(app);

// API Documentation
SetupSwagger(app);

// Monitoring routes (should be declared before other API routes)
app.use('/monitoring', MonitoringRoutes);

// API Routes
app.use('/auth', AuthRoutes);
app.use('/2fa', TwoFaRoutes);
app.use('/devices', DeviceRoutes);
app.use('/notifications', NotificationRoutes);
app.use('/password', PasswordRoutes);
app.use('/api/v1/geolocation', GeolocationRoutes);
app.use('/api/v1/payments', PaymentRoutes);

// Add PDF routes for the Black Lotus Clan
app.use('/api/pdf', PdfRoutes);

// Enhanced health check endpoint using healthMonitor
app.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.checkSystemHealth();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics: health
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(ErrorHandler);

// Device detection middleware
app.use(deviceMiddleware);

// Socket.io initialization and Notification Service integration
const server = Http.createServer(app);
const io = SocketIO(server);

// Initialize SMS and Notification Services
const smsService = new SMSService();
const notificationService = new NotificationService(io, smsService);

// Set up Socket.IO event handlers for payments
io.on('connection', (socket) => {
  socket.on('subscribe:payment', async (paymentId) => {
    socket.join(`payment:${paymentId}`);
  });

  socket.on('unsubscribe:payment', (paymentId) => {
    socket.leave(`payment:${paymentId}`);
  });
});

// Event manager setup
EventManager.setNotificationService(notificationService);

// Add payment event listeners
EventManager.on('payment.updated', async (data) => {
  const { payment, customerId } = data;
  
  // Emit to specific payment room
  io.to(`payment:${payment.id}`).emit('payment:update', {
    paymentId: payment.id,
    status: payment.status,
    updatedAt: payment.updated_at
  });

  // Emit to customer's room if they're subscribed
  io.to(`customer:${customerId}`).emit('payment:update', {
    paymentId: payment.id,
    status: payment.status,
    updatedAt: payment.updated_at
  });
});

// Add payment webhook event handlers
EventManager.on('payment.webhook.received', async (data) => {
  const { provider, webhookData } = data;
  logger.info(`Received webhook from ${provider}`, { webhookData });
});

// Store healthMonitor in app.locals for access in routes
app.locals.healthMonitor = healthMonitor;

module.exports = { app, server };
