// src/middleware/userActivityMiddleware.js
const { logger } = require('@utils/logger');
const SecurityAuditLogger = require('@services/common/securityAuditLogger');
const { performance } = require('perf_hooks');

const defaultConfig = {
  logEvents: ['request'],
  excludePaths: ['/health', '/metrics'],
  auditSecurity: true,
  rolesToLog: ['customer', 'merchant', 'staff', 'admin']
};

const userActivityMiddleware = (config = defaultConfig) => {
  const { logEvents, excludePaths, auditSecurity, rolesToLog } = { ...defaultConfig, ...config };

  return (req, res, next) => {
    const startTime = performance.now();
    const userId = req.user ? req.user.id : 'anonymous';
    const role = req.user ? req.user.role : 'unauthenticated';

    if (excludePaths.some(path => req.path.startsWith(path))) {
      logger.debug('Path excluded from activity logging', { path: req.path });
      return next();
    }

    if (!rolesToLog.includes(role) && role !== 'unauthenticated') {
      logger.debug('Role excluded from activity logging', { role, userId });
      return next();
    }

    const activityData = {
      userId,
      role,
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      headers: maskSensitiveHeaders(req.headers),
      timestamp: new Date().toISOString(),
      event: 'request'
    };

    if (logEvents.includes('request')) {
      logger.info('User activity detected', activityData);
    }

    if (auditSecurity) {
      try {
        SecurityAuditLogger.logSecurityAudit('user_activity', activityData);
      } catch (error) {
        logger.error('Failed to audit user activity', { error: error.message, userId });
      }
    }

    res.on('finish', () => {
      const duration = performance.now() - startTime;
      const responseData = {
        ...activityData,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`
      };

      logger.info('Request completed', responseData);

      if (auditSecurity) {
        SecurityAuditLogger.logSecurityAudit('request_completed', responseData);
      }
    });

    next();
  };
};

const maskSensitiveHeaders = (headers) => {
  const masked = { ...headers };
  const sensitiveFields = ['authorization', 'cookie', 'x-api-key'];
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = '[MASKED]';
    }
  });
  return masked;
};

const logCustomEvent = (eventName) => (req, res, next) => {
  const userId = req.user ? req.user.id : 'anonymous';
  const activityData = {
    userId,
    role: req.user ? req.user.role : 'unauthenticated',
    event: eventName,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    timestamp: new Date().toISOString(),
    metadata: req.body || req.query || {}
  };

  logger.info(`Custom user event: ${eventName}`, activityData);
  SecurityAuditLogger.logSecurityAudit(eventName, activityData);

  next();
};

module.exports = userActivityMiddleware;
module.exports.logCustomEvent = logCustomEvent;