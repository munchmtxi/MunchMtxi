require('dotenv').config();

const jwtConfig = {
  jwtFromRequest: require('passport-jwt').ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  algorithm: process.env.JWT_ALGORITHM || 'HS256',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

console.log('jwtConfig initialized:', {
  secretOrKey: jwtConfig.secretOrKey || '[MISSING]',
  refreshSecret: jwtConfig.refreshSecret || '[MISSING]',
  expiresIn: jwtConfig.expiresIn,
  algorithm: jwtConfig.algorithm,
});

module.exports = jwtConfig;