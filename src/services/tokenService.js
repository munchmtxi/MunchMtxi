const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

class TokenService {
  generateTokens(user) {
    const jti = uuidv4();
    return {
      accessToken: jwt.sign(
        { sub: user.id, role: user.role, jti },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      ),
      refreshToken: jwt.sign(
        { sub: user.id, jti },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      )
    };
  }

  async storeRefreshToken(userId, jti) {
    await redis.hset(`user:${userId}:refresh_tokens`, jti, 'valid');
  }

  async revokeToken(userId, jti) {
    await redis.hdel(`user:${userId}:refresh_tokens`, jti);
  }
}

module.exports = new TokenService();