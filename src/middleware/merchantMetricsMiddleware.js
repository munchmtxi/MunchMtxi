// src/middleware/merchantMetricsMiddleware.js
const { redisClient } = require('@config/redis');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { monitoringService } = require('@services/monitoringService');
const { userActivityLogger } = require('@services/userActivityLogger');
const { securityAuditLogger } = require('@services/securityAuditLogger');

class MerchantMetricsMiddleware {
  constructor() {
    this.rateLimits = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      blacklistTime: 60 * 60 * 1000 // 1 hour
    };

    this.cache = {
      duration: 300, // 5 minutes
      prefixes: {
        performance: 'metrics:performance',
        realtime: 'metrics:realtime',
        historical: 'metrics:historical'
      }
    };

    this.requestCounts = new Map();
    this.blacklist = new Map();
  }

  /**
   * Main middleware handler
   */
  handle = async (req, res, next) => {
    const startTime = Date.now();
    const { merchantId } = req.user;

    try {
      // Check rate limits
      await this.checkRateLimit(merchantId);

      // Check cache for GET requests
      if (req.method === 'GET') {
        const cachedData = await this.checkCache(req);
        if (cachedData) {
          return this.sendCachedResponse(res, cachedData);
        }
      }

      // Modify response to handle post-processing
      this.wrapResponse(req, res, startTime);

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Rate limiting
   */
  async checkRateLimit(merchantId) {
    // Check blacklist
    if (this.isBlacklisted(merchantId)) {
      throw new AppError(
        'Too many requests, please try again later',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Get and increment request count
    const count = this.incrementRequestCount(merchantId);

    // Check if limit exceeded
    if (count > this.rateLimits.maxRequests) {
      this.blacklistMerchant(merchantId);
      throw new AppError(
        'Rate limit exceeded, access temporarily blocked',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  incrementRequestCount(merchantId) {
    const now = Date.now();
    const windowStart = now - this.rateLimits.windowMs;

    // Clean old requests
    for (const [key, data] of this.requestCounts) {
      if (data.timestamp < windowStart) {
        this.requestCounts.delete(key);
      }
    }

    // Get or create merchant's request data
    const currentData = this.requestCounts.get(merchantId) || {
      count: 0,
      timestamp: now
    };

    // Increment count
    currentData.count++;
    currentData.timestamp = now;
    this.requestCounts.set(merchantId, currentData);

    return currentData.count;
  }

  isBlacklisted(merchantId) {
    const blacklistData = this.blacklist.get(merchantId);
    if (!blacklistData) return false;

    if (Date.now() > blacklistData.expiresAt) {
      this.blacklist.delete(merchantId);
      return false;
    }

    return true;
  }

  blacklistMerchant(merchantId) {
    this.blacklist.set(merchantId, {
      expiresAt: Date.now() + this.rateLimits.blacklistTime
    });
  }

  /**
   * Caching
   */
  async checkCache(req) {
    const cacheKey = this.generateCacheKey(req);
    try {
      const cachedData = await redisClient.get(cacheKey);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      logger.error('Cache retrieval error:', error);
      return null;
    }
  }

  generateCacheKey(req) {
    const { merchantId } = req.user;
    const { period_type, start_date, end_date } = req.query;
    const prefix = this.getCachePrefix(req.path);

    return `${prefix}:${merchantId}:${period_type || 'daily'}:${start_date || ''}:${end_date || ''}`;
  }

  getCachePrefix(path) {
    if (path.includes('realtime')) return this.cache.prefixes.realtime;
    if (path.includes('historical')) return this.cache.prefixes.historical;
    return this.cache.prefixes.performance;
  }

  /**
   * Response handling
   */
  wrapResponse(req, res, startTime) {
    const originalSend = res.send;
    const { merchantId, id: userId } = req.user;

    res.send = async function(data) {
      try {
        const duration = Date.now() - startTime;
        const parsedData = JSON.parse(data);

        // Only cache successful responses
        if (req.method === 'GET' && parsedData.status === 'success') {
          await this.cacheResponse(req, parsedData.data);
        }

        // Log performance metrics
        await this.logPerformance({
          merchantId,
          endpoint: req.originalUrl,
          duration,
          dataSize: Buffer.byteLength(data)
        });

        // Log activity
        await this.logActivity({
          userId,
          merchantId,
          action: 'METRICS_ACCESS',
          endpoint: req.originalUrl,
          duration
        });

      } catch (error) {
        logger.error('Response processing error:', error);
      }

      originalSend.call(this, data);
    }.bind(this);
  }

  async cacheResponse(req, data) {
    try {
      const cacheKey = this.generateCacheKey(req);
      await redisClient.setex(
        cacheKey,
        this.cache.duration,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.error('Cache storage error:', error);
    }
  }

  sendCachedResponse(res, data) {
    res.status(200).json({
      status: 'success',
      data,
      cached: true
    });
  }

  /**
   * Logging
   */
  async logPerformance(data) {
    try {
      await monitoringService.recordMetricsPerformance({
        ...data,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Performance logging error:', error);
    }
  }

  async logActivity(data) {
    try {
      await Promise.all([
        userActivityLogger.log({
          ...data,
          timestamp: new Date()
        }),
        securityAuditLogger.logSecurityAudit('METRICS_ACCESS', {
          ...data,
          severity: 'info'
        })
      ]);
    } catch (error) {
      logger.error('Activity logging error:', error);
    }
  }
}

// Export singleton instance
module.exports = new MerchantMetricsMiddleware();