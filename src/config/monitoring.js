const winston = require('winston');
const statusMonitor = require('express-status-monitor');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

class SystemHealthMonitor {
  constructor(app, logger) {
    this.app = app;
    this.logger = logger;
    this.healthMetrics = {
      lastCheck: null,
      metrics: {},
      predictions: {}
    };
    // Initialize API Metrics tracking for our battle strategy
    this.apiMetrics = {
      usage: new Map(),
      quotas: new Map(),
      trends: new Map()
    };
    this.usageHistory = []; // Store historical data for trend analysis
  }

  // System Health Monitoring Methods
  async checkSystemHealth() {
    const metrics = {
      memory: this._checkMemoryUsage(),
      cpu: this._checkCPUUsage(),
      disk: await this._checkDiskSpace(),
      processUptime: process.uptime(),
      lastChecked: new Date()
    };

    this.healthMetrics.metrics = metrics;
    this._analyzePredictiveHealth(metrics);
    return metrics;
  }

  _checkMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: used.heapUsed / 1024 / 1024,
      heapTotal: used.heapTotal / 1024 / 1024,
      external: used.external / 1024 / 1024,
      rss: used.rss / 1024 / 1024
    };
  }

  _checkCPUUsage() {
    const startUsage = process.cpuUsage();
    // Wait for 100ms to sample CPU usage
    const now = performance.now();
    while (performance.now() - now < 100) {}
    const endUsage = process.cpuUsage(startUsage);
    return {
      user: endUsage.user / 1000000,
      system: endUsage.system / 1000000
    };
  }

  async _checkDiskSpace() {
    // Implement disk space check using fs.statfs (ensure your environment supports it)
    return new Promise((resolve) => {
      fs.statfs('/', (err, stats) => {
        if (err) {
          this.logger.error('Error checking disk space', err);
          resolve(null);
        } else {
          resolve({
            free: stats.bfree * stats.bsize,
            total: stats.blocks * stats.bsize
          });
        }
      });
    });
  }

  _analyzePredictiveHealth(metrics) {
    const predictions = {
      memoryExhaustion: this._predictMemoryExhaustion(metrics.memory),
      diskSpaceExhaustion: this._predictDiskSpaceExhaustion(metrics.disk),
      performanceDegradation: this._predictPerformanceDegradation()
    };

    this.healthMetrics.predictions = predictions;
    return predictions;
  }

  _predictMemoryExhaustion(memory) {
    // If heapUsed exceeds 80% of heapTotal, flag as high risk
    if (memory.heapUsed / memory.heapTotal > 0.8) {
      return { risk: 'high' };
    }
    return { risk: 'low' };
  }

  _predictDiskSpaceExhaustion(disk) {
    if (!disk) {
      return { risk: 'unknown' };
    }
    // If free disk space is less than 10% of total, flag as high risk
    if (disk.free / disk.total < 0.1) {
      return { risk: 'high' };
    }
    return { risk: 'low' };
  }

  _predictPerformanceDegradation() {
    // A simple stub – always returns low risk for now.
    return { risk: 'low' };
  }

  // Advanced Resource Utilization Analysis Methods
  async analyzeResourceUtilization() {
    const currentMetrics = await this.checkSystemHealth();
    const utilizationHistory = this.usageHistory.slice(-24); // Last 24 data points

    const analysis = {
      current: this._getCurrentUtilization(currentMetrics),
      trends: this._analyzeTrends(utilizationHistory),
      recommendations: this._generateRecommendations(currentMetrics),
      scalingNeeded: false
    };

    // Determine if scaling is needed
    if (analysis.current.cpu > 70 || analysis.current.memory > 80) {
      analysis.scalingNeeded = true;
      analysis.scalingRecommendations = this._getScalingRecommendations(analysis);
    }

    return analysis;
  }

  _getCurrentUtilization(metrics) {
    return {
      cpu: (metrics.cpu.user + metrics.cpu.system) * 100, // Convert to percentage
      memory: (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100,
      disk: metrics.disk ? ((metrics.disk.total - metrics.disk.free) / metrics.disk.total) * 100 : null
    };
  }

  _analyzeTrends(history) {
    if (history.length < 2) return null;

    const trends = {
      cpu: this._calculateGrowthRate(history.map(h => h.cpu)),
      memory: this._calculateGrowthRate(history.map(h => h.memory)),
      requests: this._calculateGrowthRate(history.map(h => h.requestCount))
    };

    return {
      ...trends,
      pattern: this._detectUsagePattern(history)
    };
  }

  _calculateGrowthRate(values) {
    const first = values[0];
    const last = values[values.length - 1];
    return {
      rate: ((last - first) / first) * 100,
      direction: last > first ? 'increasing' : 'decreasing'
    };
  }

  _detectUsagePattern(history) {
    // Implement pattern detection (e.g., spikes during certain hours)
    const hourlyAverages = new Array(24).fill(0);
    history.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourlyAverages[hour] += record.cpu;
    });

    return {
      peakHours: hourlyAverages
        .map((avg, hour) => ({ hour, avg }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map(x => x.hour)
    };
  }

  _generateRecommendations(metrics) {
    const recommendations = [];

    // CPU Recommendations
    if ((metrics.cpu.user + metrics.cpu.system) > 70) {
      recommendations.push({
        type: 'cpu',
        severity: 'high',
        message: 'High CPU utilization detected',
        action: 'Consider upgrading CPU capacity or optimizing CPU-intensive operations'
      });
    }

    // Memory Recommendations
    const memoryUtilization = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (memoryUtilization > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory utilization detected',
        action: 'Consider increasing memory allocation or investigating memory leaks'
      });
    }

    // Disk Space Recommendations
    if (metrics.disk && (metrics.disk.free / metrics.disk.total) < 0.2) {
      recommendations.push({
        type: 'disk',
        severity: 'medium',
        message: 'Low disk space warning',
        action: 'Consider cleaning up temporary files or increasing disk space'
      });
    }

    return recommendations;
  }

  _getScalingRecommendations(analysis) {
    const recommendations = {
      immediate: [],
      scheduled: []
    };

    // Immediate scaling recommendations
    if (analysis.current.cpu > 85) {
      recommendations.immediate.push({
        resource: 'cpu',
        action: 'scale_up',
        suggestion: 'Increase CPU allocation by 50%'
      });
    }

    if (analysis.current.memory > 90) {
      recommendations.immediate.push({
        resource: 'memory',
        action: 'scale_up',
        suggestion: 'Double the memory allocation'
      });
    }

    // Scheduled scaling based on patterns
    if (analysis.trends?.pattern?.peakHours) {
      recommendations.scheduled.push({
        resource: 'all',
        action: 'scale_up',
        schedule: `Before peak hours (${analysis.trends.pattern.peakHours.join(', ')})`,
        suggestion: 'Increase resources by 30% during peak hours'
      });
    }

    return recommendations;
  }

  // API Metrics Tracking Methods
  trackApiCall(endpoint, method, userId) {
    const key = `${method}:${endpoint}`;
    const current = this.apiMetrics.usage.get(key) || {
      count: 0,
      byUser: new Map(),
      lastReset: new Date()
    };

    current.count++;
    const userCount = current.byUser.get(userId) || 0;
    current.byUser.set(userId, userCount + 1);

    this.apiMetrics.usage.set(key, current);
    this._updateTrends(key);
  }

  _updateTrends(key) {
    const usage = this.apiMetrics.usage.get(key);
    const now = new Date();

    this.usageHistory.push({
      key,
      count: usage.count,
      timestamp: now
    });

    // Keep only the last 30 days of history
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    this.usageHistory = this.usageHistory.filter(h => h.timestamp > thirtyDaysAgo);

    // Calculate trend using our warrior's strategy
    const trend = this._calculateTrend(key);
    this.apiMetrics.trends.set(key, trend);
  }

  _calculateTrend(key) {
    const relevantHistory = this.usageHistory.filter(h => h.key === key);
    if (relevantHistory.length < 2) return { slope: 0, forecast: null };

    // Simple linear regression
    const xValues = relevantHistory.map(h => h.timestamp.getTime());
    const yValues = relevantHistory.map(h => h.count);

    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;

    const slope = this._calculateSlope(xValues, yValues, xMean, yMean);

    // Forecast for the next 24 hours (in milliseconds)
    const forecast = yMean + slope * (24 * 60 * 60 * 1000);

    return {
      slope,
      forecast,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
    };
  }

  _calculateSlope(xValues, yValues, xMean, yMean) {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < xValues.length; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  setQuota(endpoint, method, limit) {
    const key = `${method}:${endpoint}`;
    this.apiMetrics.quotas.set(key, limit);
  }

  checkQuota(endpoint, method, userId) {
    const key = `${method}:${endpoint}`;
    const usage = this.apiMetrics.usage.get(key);
    const quota = this.apiMetrics.quotas.get(key);

    if (!quota) return true; // No quota set

    const userUsage = usage?.byUser.get(userId) || 0;
    return userUsage < quota;
  }
}

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

  // Initialize the custom System Health Monitor
  const healthMonitor = new SystemHealthMonitor(app, logger);

  // Add health check endpoint at "/health"
  app.get('/health', async (req, res) => {
    try {
      const health = await healthMonitor.checkSystemHealth();
      res.json(health);
    } catch (error) {
      logger.error('Health check endpoint error', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Schedule regular health checks every 5 minutes
  setInterval(async () => {
    try {
      const health = await healthMonitor.checkSystemHealth();
      if (
        health.predictions.memoryExhaustion.risk === 'high' || 
        health.predictions.diskSpaceExhaustion.risk === 'high'
      ) {
        logger.warn('System health risk detected', health);
      }
    } catch (error) {
      logger.error('Health check failed', error);
    }
  }, 5 * 60 * 1000); // 5 minutes interval

  console.log('[Monitoring] 🔄 Health monitoring initialized.');

  return { logger, healthMonitor };
};
