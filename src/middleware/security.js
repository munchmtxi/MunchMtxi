const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

module.exports = function securityMiddleware(app) {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"]
      }
    }
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  }));

  // Request validation
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    next();
  });
};