const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('@models');
const jwtConfig = require('@config/jwtConfig');

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
    console.log('JWT Payload received:', payload);
    try {
      if (!payload || !payload.id) {
        console.log('Invalid token payload:', payload);
        return done(null, false, { message: 'Invalid token payload' });
      }

      const user = await User.findByPk(payload.id);
      if (!user) {
        console.log('User not found for ID:', payload.id);
        return done(null, false, { message: 'User not found' });
      }
      if (user.status !== 'active') {
        console.log('User inactive:', payload.id);
        return done(null, false, { message: 'User account is inactive' });
      }

      console.log('User authenticated:', user.id, user.role_id);
      return done(null, user);
    } catch (error) {
      console.error('Error during JWT verification:', error);
      return done(error, false);
    }
  });

  strategy.on = (event, handler) => {
    if (event === 'error') {
      console.error('JWT Strategy error:', handler);
    }
  };

  passport.use(strategy);
  console.log('JWT Strategy registered');
};

const setupPassport = (app) => {
  configurePassport();
  app.use(passport.initialize());
  console.log('Passport initialized');
};

module.exports = { setupPassport };