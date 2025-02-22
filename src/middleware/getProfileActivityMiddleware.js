// src/middleware/profileActivityMiddleware/getProfileActivityMiddleware.js
const { logger } = require('@utils/logger');

class GetProfileActivityMiddleware {
  handle(req, res, next) {
    const start = Date.now();
    
    // Store original send
    const originalSend = res.send;
    
    res.send = function (data) {
      const duration = Date.now() - start;
      
      // Log the activity
      logger.info('Merchant profile accessed', {
        merchantId: req.user.merchantId,
        userId: req.user.id,
        duration,
        timestamp: new Date()
      });
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  }
}

module.exports = new GetProfileActivityMiddleware();