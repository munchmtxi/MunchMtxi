// src/services/monitoringService.js
const { logger, PerformanceMonitor } = require('@utils/logger');
const AppError = require('@utils/AppError');
const process = require('process');

class MonitoringService {
  constructor() {
    this.apiMetrics = {
      usage: new Map(),
      trends: new Map(),
      quotas: new Map()
    };
  }

  async getMetrics() {
    try {
      return PerformanceMonitor.getMetricsSummary();
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      throw new AppError('Failed to fetch metrics', 500);
    }
  }

  async checkSystemHealth() {
    try {
      const dbStatus = await this.checkDatabaseHealth();
      const cacheStatus = await this.checkCacheHealth();
      const queueStatus = await this.checkQueueHealth();
      const apiStatus = await this.checkExternalAPIsHealth();

      const systemHealth = {
        status: 'operational',
        timestamp: new Date(),
        services: {
          database: dbStatus,
          cache: cacheStatus,
          queue: queueStatus,
          externalAPIs: apiStatus
        },
        uptime: process.uptime(),
        memory: this.getMemoryUsage(),
        cpu: process.cpuUsage()
      };

      // Overall status is degraded if any service is not healthy
      if (Object.values(systemHealth.services).some(status => status !== 'healthy')) {
        systemHealth.status = 'degraded';
      }

      return systemHealth;
    } catch (error) {
      logger.error('Health check failed:', error);
      throw new AppError('System health check failed', 500);
    }
  }

  async getErrorStats(timeframe) {
    try {
      const metrics = PerformanceMonitor.getMetricsSummary();
      const endpointMetrics = metrics.endpoints;
      
      const errorStats = {
        total: 0,
        byType: {},
        byEndpoint: {},
        trend: []
      };

      Object.entries(endpointMetrics).forEach(([endpoint, data]) => {
        Object.entries(data.statusCodes).forEach(([statusCode, count]) => {
          if (parseInt(statusCode) >= 400) {
            errorStats.total += count;
            const errorType = parseInt(statusCode) >= 500 ? 'server_error' : 'client_error';
            errorStats.byType[errorType] = (errorStats.byType[errorType] || 0) + count;
            errorStats.byEndpoint[endpoint] = (errorStats.byEndpoint[endpoint] || 0) + count;
          }
        });
      });

      return errorStats;
    } catch (error) {
      logger.error('Error fetching error statistics:', error);
      throw new AppError('Failed to fetch error statistics', 500);
    }
  }

  async getActiveUserStats() {
    try {
      const metrics = PerformanceMonitor.getMetricsSummary();
      const endpointMetrics = metrics.endpoints;
      
      const activeStats = {
        currentActive: 0,
        peak24h: 0,
        byPlatform: {},
        byRegion: {}
      };

      // Calculate unique users across all endpoints
      Object.values(endpointMetrics).forEach(endpoint => {
        activeStats.currentActive += endpoint.uniqueUsers || 0;
      });

      activeStats.byPlatform = {
        web: activeStats.currentActive * 0.6,
        mobile: activeStats.currentActive * 0.4
      };

      activeStats.peak24h = Math.max(
        ...Object.values(endpointMetrics)
          .map(endpoint => endpoint.requestsPerMinute || 0)
      ) * 60;

      return activeStats;
    } catch (error) {
      logger.error('Error fetching active user statistics:', error);
      throw new AppError('Failed to fetch active user statistics', 500);
    }
  }

  async getResourceUsage() {
    try {
      const used = process.memoryUsage();
      return {
        memory: {
          heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
          external: Math.round(used.external / 1024 / 1024 * 100) / 100,
          rss: Math.round(used.rss / 1024 / 1024 * 100) / 100
        },
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        performance: PerformanceMonitor.getMetricsSummary().performance
      };
    } catch (error) {
      logger.error('Error fetching resource usage:', error);
      throw new AppError('Failed to fetch resource usage', 500);
    }
  }

  setApiQuota(endpoint, method, limit) {
    this.apiMetrics.quotas.set(`${method}:${endpoint}`, limit);
  }

  async analyzeResourceUtilization() {
    try {
      const currentUsage = await this.getResourceUsage();
      const metrics = await this.getMetrics();
      
      return {
        currentUsage,
        trends: metrics.performance,
        recommendations: this.generateResourceRecommendations(currentUsage, metrics)
      };
    } catch (error) {
      logger.error('Error analyzing resource utilization:', error);
      throw new AppError('Failed to analyze resource utilization', 500);
    }
  }

  // Private helper methods
  async checkDatabaseHealth() {
    // Implement database health check
    return 'healthy';
  }

  async checkCacheHealth() {
    // Implement cache health check
    return 'healthy';
  }

  async checkQueueHealth() {
    // Implement queue health check
    return 'healthy';
  }

  async checkExternalAPIsHealth() {
    // Implement external APIs health check
    return 'healthy';
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      external: used.external,
      rss: used.rss
    };
  }

  generateResourceRecommendations(currentUsage, metrics) {
    const recommendations = [];
    
    // Memory recommendations
    if (currentUsage.memory.heapUsed / currentUsage.memory.heapTotal > 0.85) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'Memory usage is approaching capacity. Consider optimizing memory usage or scaling up.'
      });
    }

    // CPU recommendations
    if (metrics.performance.cpuUtilization > 80) {
      recommendations.push({
        type: 'cpu',
        severity: 'medium',
        message: 'High CPU utilization detected. Consider implementing caching or optimizing compute-heavy operations.'
      });
    }

    return recommendations;
  }
}

module.exports = new MonitoringService();