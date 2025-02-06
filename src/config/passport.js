const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');

// Debugging: Ensure jwtConfig.secretOrKey is defined
if (!jwtConfig.secretOrKey) {
  console.error('JWT_SECRET is missing or invalid. Check your .env file.');
  process.exit(1);
}

const configurePassport = () => {
  passport.use(
    new JwtStrategy(jwtConfig, async (payload, done) => {
      try {
        if (!payload || !payload.id) {
          return done(null, false, { message: 'Invalid token payload' });
        }

        const user = await User.findByPk(payload.id);

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }
        if (!user.isActive) {
          return done(null, false, { message: 'User account is inactive' });
        }

        return done(null, user);
      } catch (error) {
        console.error('Error during JWT verification:', error);
        return done(error, false);
      }
    })
  );
};

const setupPassport = (app) => {
  configurePassport();
  app.use(passport.initialize());
};

// Export as an object with setupPassport function
module.exports = { setupPassport };