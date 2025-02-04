const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');

// Debugging: Ensure jwtConfig.secretOrKey is defined
if (!jwtConfig.secretOrKey) {
  console.error('JWT_SECRET is missing or invalid. Check your .env file.');
  process.exit(1);
}

passport.use(
  new JwtStrategy(jwtConfig, async (payload, done) => {
    try {
      // Validate payload structure
      if (!payload || !payload.id) {
        return done(null, false, { message: 'Invalid token payload' });
      }

      // Find user by ID
      const user = await User.findByPk(payload.id);

      // Check if user exists and is active
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      if (!user.isActive) {
        return done(null, false, { message: 'User account is inactive' });
      }

      // User authenticated
      return done(null, user);
    } catch (error) {
      // Log error
      console.error('Error during JWT verification:', error);
      return done(error, false);
    }
  })
);

const setupPassport = (app) => {
  app.use(passport.initialize());
};

module.exports = { setupPassport };
