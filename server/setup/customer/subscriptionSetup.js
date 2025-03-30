'use strict';

const subscriptionRoutes = require('@routes/customer/subscriptionRoutes');
const { setupPassport } = require('@config/passport');
const { logger } = require('@utils/logger');

const setupSubscriptions = (app) => {
  // Initialize Passport for JWT authentication
  setupPassport(app);
  logger.info('🔐 Passport initialized for subscriptions');

  // Mount subscription routes under /api/v1/subscriptions
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  logger.info('🛤️ Subscription routes mounted at /api/v1/subscriptions');
};

module.exports = setupSubscriptions;