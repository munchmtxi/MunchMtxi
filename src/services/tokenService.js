const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { Device } = require('@models'); // Add this
const { Op } = require('sequelize'); // Add this
const AppError = require('@utils/AppError'); // Add this

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

class TokenService {
  // Token generation
  generateTokens(user) {
    const jti = uuidv4();
    try {
      const accessToken = jwt.sign(
        { sub: user.id, role: user.role, jti },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      
      const refreshToken = jwt.sign(
        { sub: user.id, jti },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Store the refresh token
      this.storeRefreshToken(user.id, jti);

      return { accessToken, refreshToken, jti };
    } catch (error) {
      throw new AppError('Error generating tokens', 500);
    }
  }

  // Redis token management
  async storeRefreshToken(userId, jti) {
    try {
      await redis.hset(`user:${userId}:refresh_tokens`, jti, 'valid');
    } catch (error) {
      throw new AppError('Error storing refresh token', 500);
    }
  }

  async revokeToken(userId, jti) {
    try {
      await redis.hdel(`user:${userId}:refresh_tokens`, jti);
    } catch (error) {
      throw new AppError('Error revoking token', 500);
    }
  }

  async logoutUser(userId) {
    try {
      // Invalidate all refresh tokens for the user
      await redis.del(`user:${userId}:refresh_tokens`);
      
      // Add to blacklist with small TTL to prevent immediate reuse of access token
      const blacklistKey = `token_blacklist:${userId}`;
      await redis.setex(blacklistKey, 900, 'logged_out'); // 15 minutes TTL
    } catch (error) {
      throw new AppError('Error during logout', 500);
    }
  }

  async isTokenBlacklisted(userId) {
    try {
      return await redis.exists(`token_blacklist:${userId}`);
    } catch (error) {
      throw new AppError('Error checking token blacklist', 500);
    }
  }

  // Remember Me functionality
  async generateRememberToken(userId, deviceId) {
    try {
      const rememberToken = uuidv4();
      const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days

      await Device.update({
        remember_token: rememberToken,
        remember_token_expires_at: expiresAt,
        last_active_at: new Date()
      }, {
        where: {
          user_id: userId,
          device_id: deviceId
        }
      });

      return {
        rememberToken,
        expiresAt
      };
    } catch (error) {
      throw new AppError('Error generating remember token', 500);
    }
  }

  async validateRememberToken(userId, deviceId, token) {
    try {
      const device = await Device.findOne({
        where: {
          user_id: userId,
          device_id: deviceId,
          remember_token: token,
          remember_token_expires_at: {
            [Op.gt]: new Date()
          }
        }
      });

      return !!device;
    } catch (error) {
      throw new AppError('Error validating remember token', 500);
    }
  }

  async clearRememberToken(userId, deviceId) {
    try {
      await Device.update({
        remember_token: null,
        remember_token_expires_at: null
      }, {
        where: {
          user_id: userId,
          device_id: deviceId
        }
      });
    } catch (error) {
      throw new AppError('Error clearing remember token', 500);
    }
  }

  async clearAllRememberTokens(userId) {
    try {
      await Device.update({
        remember_token: null,
        remember_token_expires_at: null
      }, {
        where: {
          user_id: userId
        }
      });
    } catch (error) {
      throw new AppError('Error clearing all remember tokens', 500);
    }
  }
}

module.exports = new TokenService();