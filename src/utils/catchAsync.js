'use strict';
const loggerModule = require('@utils/logger');
const logger = loggerModule.logger || loggerModule; // Handle both { logger } and direct export

module.exports = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('catchAsync caught error', { error: err.message, stack: err.stack });
      if (res && typeof res.status === 'function') {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
      } else {
        next(err);
      }
    });
  };
};