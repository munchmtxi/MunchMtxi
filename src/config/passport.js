/**
 * Passport JWT Authentication Configuration
 * 
 * This module configures Passport.js to use JSON Web Tokens (JWT) for authentication.
 * It sets up a JWT strategy to validate tokens, fetch user data, and handle errors.
 * The configuration ensures secure and flexible authentication using environment-based settings.
 * 
 * @module passportConfig
 */

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');

/**
 * Ensures that the JWT secret key is defined in the environment variables.
 * If the secret key is missing, logs an error and terminates the application.
 */
if (!jwtConfig.secretOrKey) {
  console.error('JWT_SECRET is missing or invalid. Check your .env file.');
  process.exit(1);
}

/**
 * Configures Passport to use the JWT strategy for authentication.
 * 
 * @function configurePassport
 * @description Sets up the JWT strategy with options from `jwtConfig` and defines the verification logic.
 * - Validates the token payload.
 * - Fetches the user from the database using the payload's `id`.
 * - Checks if the user exists and is active.
 * - Handles errors gracefully during the verification process.
 */
const configurePassport = () => {
  passport.use(
    new JwtStrategy(jwtConfig, async (payload, done) => {
      try {
        // Validate the token payload
        if (!payload || !payload.id) {
          return done(null, false, { message: 'Invalid token payload' });
        }

        // Fetch the user from the database
        const user = await User.findByPk(payload.id);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Check if the user account is active
        if (!user.isActive) {
          return done(null, false, { message: 'User account is inactive' });
        }

        // Return the authenticated user
        return done(null, user);
      } catch (error) {
        // Log and handle errors during JWT verification
        console.error('Error during JWT verification:', error);
        return done(error, false);
      }
    })
  );
};

/**
 * Initializes Passport and sets up the JWT authentication middleware.
 * 
 * @function setupPassport
 * @param {Object} app - The Express application instance.
 * @description Calls `configurePassport` to set up the JWT strategy and initializes Passport middleware.
 */
const setupPassport = (app) => {
  configurePassport();
  app.use(passport.initialize());
};

/**
 * Exports the Passport configuration as an object with the `setupPassport` function.
 * 
 * @exports
 * @type {Object}
 * @property {Function} setupPassport - Function to initialize Passport with JWT authentication.
 */
module.exports = { setupPassport };