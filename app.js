const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Create Express app first
const app = express();

// Initialize monitoring AFTER app is created
const initMonitoring = require('@config/monitoring');
initMonitoring(app);

const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const securityMiddleware = require('@middleware/security');
const errorHandlerMiddleware = require('@middleware/errorHandler');
const rateLimiterMiddleware = require('@middleware/rateLimiter');
const requestLoggerMiddleware = require('@middleware/requestLogger');
const config = require('@config/config');
const AppError = require('@utils/AppError');

// ------------------------
// Security Middleware
// ------------------------
app.use(helmet());
app.use(cors());
securityMiddleware(app);

// ------------------------
// Body Parsing Middleware
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Logging Middleware
// ------------------------
app.use(morgan('combined')); // HTTP request logger
app.use(requestLoggerMiddleware); // Custom request logger

// ------------------------
// Rate Limiting Middleware
// ------------------------
app.use(rateLimiterMiddleware);

// ------------------------
// Initialize Passport
// ------------------------
setupPassport(app);

// ------------------------
// Swagger API Documentation
// ------------------------
setupSwagger(app);

// ------------------------
// Routes
// ------------------------
app.use('/auth', require('@routes/authRoutes')); // Authentication routes
app.use('/2fa', require('@routes/2faRoutes')); // Two-factor authentication routes
app.use('/devices', require('@routes/deviceRoutes')); // Device management routes
app.use('/notifications', require('@routes/notificationRoutes')); // Notification routes
app.use('/password', require('@routes/passwordRoutes')); // Password management routes

// ------------------------
// Handle Undefined Routes
// ------------------------
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ------------------------
// Global Error Handling Middleware
// ------------------------
app.use(errorHandlerMiddleware);

module.exports = app;
