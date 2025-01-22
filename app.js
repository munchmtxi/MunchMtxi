const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { setupPassport } = require('./config/passport');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Initialize passport
setupPassport(app);

// Routes will be added here
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/customer', customerRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;