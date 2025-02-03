const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const errorHandler = require('./src/middleware/errorHandler');
const { rateLimiter } = require('./src/middleware/rateLimiter');
const { requestLogger } = require('./src/middleware/requestLogger');
const { setupPassport } = require('./src/config/passport');
const { setupSwagger } = require('./src/config/swagger');
const config = require('./config/config');
const securityMiddleware = require('./src/middleware/security');
const { initMonitoring } = require('./src/config/monitoring');
const tokenService = require('./src/services/tokenService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const twoFARoutes = require('./routes/2faRoutes'); // Import 2FA routes
const deviceRoutes = require('./routes/deviceRoutes'); // Import device routes
const notificationRoutes = require('./routes/notificationRoutes'); // Import notification routes
const passwordRoutes = require('./routes/passwordRoutes'); // Import password routes

// Uncomment and import other routes as needed
// const adminRoutes = require('./routes/adminRoutes');
// const customerRoutes = require('./routes/customerRoutes');

const AppError = require('./utils/AppError');

const app = express();

// ------------------------
// Security Middleware
// ------------------------
app.use(helmet());
app.use(cors());
securityMiddleware(app);

// Initialize monitoring
const { logger } = initMonitoring(app);

// ------------------------
// Body Parsing Middleware
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Logging Middleware
// ------------------------
// HTTP request logger
app.use(morgan('combined'));

// Custom request logger using Winston
app.use(requestLogger);

// ------------------------
// Rate Limiting Middleware
// ------------------------
app.use(rateLimiter);

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
app.use('/auth', authRoutes); // Authentication routes
app.use('/2fa', twoFARoutes); // Two-factor authentication routes
app.use('/devices', deviceRoutes); // Device management routes
app.use('/notifications', notificationRoutes); // Notification routes
app.use('/password', passwordRoutes); // Password management routes

// Uncomment and add other routes as needed
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/customer', customerRoutes);

// Example protected route from first file
app.get('/admin', (req, res) => {
  // Your admin route logic
});

// ------------------------
// Handle Undefined Routes
// ------------------------
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ------------------------
// Global Error Handling Middleware
// ------------------------
app.use(errorHandler);

// ------------------------
// Start Server
// ------------------------
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;