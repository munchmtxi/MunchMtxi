// app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { logger } = require('@utils/logger');

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger middleware (after logger is initialized)
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

// Initialize authentication
const { setupPassport } = require('@config/passport');  // Notice the destructuring here
setupPassport(app);

// API Documentation
const { setupSwagger } = require('@config/swagger');
setupSwagger(app);

// API Routes
app.use('/auth', require('@routes/authRoutes'));
app.use('/2fa', require('@routes/2faRoutes'));
app.use('/devices', require('@routes/deviceRoutes'));
app.use('/notifications', require('@routes/notificationRoutes'));
app.use('/password', require('@routes/passwordRoutes'));
app.use('/api/v1/geolocation', require('@routes/geolocationRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Handle undefined routes
const AppError = require('@utils/AppError');
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
const errorHandler = require('@middleware/errorHandler');
app.use(errorHandler);

module.exports = app;