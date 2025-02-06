const winston = require('winston');
const statusMonitor = require('express-status-monitor');
const path = require('path');
const fs = require('fs');

module.exports = function initMonitoring(app) {
  if (!app) {
    console.error('[Monitoring] ❌ Express app instance is required!');
    throw new Error('Express app instance is required for monitoring initialization');
  }

  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('[Monitoring] 📂 Created logs directory:', logsDir);
  }

  // Winston logger setup
  console.log('[Monitoring] 📝 Initializing Winston logger...');
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log')
      })
    ],
  });

  // Add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
    console.log('[Monitoring] 🖥️ Winston console logging enabled (development mode).');
  }

  // Configure status monitor with auth check middleware
  const statusMonitorConfig = {
    title: 'MunchMtxi Status',
    path: '/status',
    spans: [{ interval: 1, retention: 60 }],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true
    }
  };

  if (process.env.NODE_ENV === 'production') {
    // Add authentication middleware for production
    const authMiddleware = (req, res, next) => {
      const username = process.env.STATUS_MONITOR_USERNAME;
      const password = process.env.STATUS_MONITOR_PASSWORD;
      
      if (!username || !password) {
        logger.error('[Monitoring] Status monitor credentials not configured');
        return res.status(500).json({ error: 'Monitor configuration error' });
      }

      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [providedUser, providedPass] = Buffer.from(b64auth, 'base64').toString().split(':');

      if (providedUser === username && providedPass === password) {
        return next();
      }

      res.set('WWW-Authenticate', 'Basic realm="401"');
      res.status(401).send('Authentication required');
    };

    statusMonitorConfig.authorize = authMiddleware;
    logger.info('[Monitoring] 🔒 Status monitor authentication enabled (production mode).');
  }

  // Initialize status monitor with configuration
  try {
    app.use(statusMonitor(statusMonitorConfig));
    console.log('[Monitoring] ✅ Express Status Monitor initialized.');
  } catch (error) {
    logger.error('[Monitoring] ❌ Failed to initialize status monitor:', error);
  }

  return { logger };
};