// src/config/passport.js
'use strict';
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');
const { logger } = require('@utils/logger'); // Add logger

console.log('Initializing passport with jwtConfig:', {
  secretOrKey: jwtConfig.secretOrKey || '[MISSING]',
  jwtFromRequest: typeof jwtConfig.jwtFromRequest,
});

if (!jwtConfig.secretOrKey) {
  console.error('JWT_SECRET is missing or invalid. Check your .env file.');
  process.exit(1);
}
if (!jwtConfig.jwtFromRequest) {
  console.error('jwtFromRequest is missing in jwtConfig.');
  process.exit(1);
}

const configurePassport = () => {
  const strategy = new JwtStrategy(jwtConfig, async (payload, done) => {
    logger.info('JWT Payload received:', payload);
    try {
      if (!payload || !payload.id) {
        logger.warn('Invalid token payload:', payload);
        return done(null, false, { message: 'Invalid token payload' });
      }

      const user = await User.findByPk(payload.id);
      if (!user) {
        logger.warn('User not found for ID:', payload.id);
        return done(null, false, { message: 'User not found' });
      }
      if (user.status !== 'active') {
        logger.warn('User inactive:', payload.id);
        return done(null, false, { message: 'User account is inactive' });
      }

      const userData = {
        id: user.id,
        roleId: user.role_id, // Map role_id to roleId
      };
      logger.info('User authenticated:', { id: user.id, roleId: user.role_id });
      return done(null, userData);
    } catch (error) {
      logger.error('Error during JWT verification:', error);
      return done(error, false);
    }
  });

  strategy.on = (event, handler) => {
    if (event === 'error') {
      logger.error('JWT Strategy error:', handler);
    }
  };

  passport.use(strategy);
  logger.info('JWT Strategy registered');
};

const setupPassport = (app) => {
  configurePassport();
  app.use(passport.initialize());
  logger.info('Passport initialized');
};

module.exports = { setupPassport };