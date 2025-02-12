const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { logger } = require('@utils/logger');

// Create Express app
const app = express();

// Initialize monitoring system
const initMonitoring = require('@config/monitoring');
const { healthMonitor } = initMonitoring(app);

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger middleware
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  }
}));

// Apply security middleware
const securityMiddleware = require('@middleware/security');
securityMiddleware(app);

// Custom request logger
const requestLogger = require('@middleware/requestLogger');
app.use(requestLogger);

// Performance monitoring and API usage middleware
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
app.use(performanceMiddleware);  // Use the base performance middleware
app.use(apiUsageMiddleware(healthMonitor));  // Use the API usage monitoring middleware 

// Initialize authentication
const { setupPassport } = require('@config/passport');
setupPassport(app);

// API Documentation
const { setupSwagger } = require('@config/swagger');
setupSwagger(app);

// Monitoring routes should be before other API routes
app.use('/monitoring', require('@routes/monitoringRoutes'));

// API Routes
app.use('/auth', require('@routes/authRoutes'));
app.use('/2fa', require('@routes/2faRoutes'));
app.use('/devices', require('@routes/deviceRoutes'));
app.use('/notifications', require('@routes/notificationRoutes'));
app.use('/password', require('@routes/passwordRoutes'));
app.use('/api/v1/geolocation', require('@routes/geolocationRoutes'));
app.use('/api/v1/payments', require('@routes/paymentRoutes'));

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
const AppError = require('@utils/AppError');
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
const errorHandler = require('@middleware/errorHandler');
app.use(errorHandler);

// Socket.io initialization and Notification Service integration
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

// Initialize SMS and Notification Services
const SMSService = require('@services/smsService');
const NotificationService = require('@services/notificationService');

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
const eventManager = require('@services/eventManager');
eventManager.setNotificationService(notificationService);

// Add payment event listeners
eventManager.on('payment.updated', async (data) => {
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
eventManager.on('payment.webhook.received', async (data) => {
  const { provider, webhookData } = data;
  logger.info(`Received webhook from ${provider}`, { webhookData });
});

// Store healthMonitor in app.locals for access in routes
app.locals.healthMonitor = healthMonitor;

module.exports = { app, server };