const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { setupPassport } = require('./config/passport');
const { setupSwagger } = require('./config/swagger');
const config = require('./config/config');

// Route imports
const authRoutes = require('./routes/authRoutes');
// const adminRoutes = require('./routes/adminRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// Add other route imports here

const AppError = require('./utils/AppError');

const app = express();

// ------------------------
// Security Middleware
// ------------------------
app.use(helmet());
app.use(cors());

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
app.use('/auth', authRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/customer', customerRoutes);
// Add other routes here

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

module.exports = app;
