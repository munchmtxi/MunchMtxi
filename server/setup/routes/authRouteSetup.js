// server/setup/routes/authRouteSetup.js
const AuthRoutes = require('@routes/authRoutes');
const { logger } = require('@utils/logger');

logger.info('File loaded: authRouteSetup.js');

module.exports = {
  setupAuthRoutes: (app) => {
    logger.info('Setting up auth routes...');
    app.use('/auth', AuthRoutes);
    logger.info('Auth routes mounted at /auth (includes /register, /login, /token, /merchant/login, /merchant/logout, /register-role)');
  }
};