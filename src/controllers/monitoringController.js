// src/controllers/monitoringController.js
const monitoringService = require('../services/monitoringService'); // Import the service instance
const logger = require('@utils/logger');

class MonitoringController {
    constructor() {
        // Use the imported service instance directly
        this.monitoringService = monitoringService;
    }

    async getMetrics(req, res, next) {
        try {
            const metrics = await this.monitoringService.getMetrics();
            res.json({
                status: 'success',
                timestamp: new Date(),
                data: metrics
            });
        } catch (error) {
            next(error);
        }
    }

    async checkHealth(req, res, next) {
        try {
            const health = await this.monitoringService.checkSystemHealth();
            res.json({
                status: 'success',
                timestamp: new Date(),
                data: health
            });
        } catch (error) {
            next(error);
        }
    }
  
    async getErrorStats(req, res, next) {
      try {
        const timeframe = req.query.timeframe || '24h';
        const errors = await this.monitoringService.getErrorStats(timeframe);
        res.json({
          status: 'success',
          timestamp: new Date(),
          timeframe,
          data: errors
        });
      } catch (error) {
        next(error);
      }
    }
  
    async getActiveUsers(req, res, next) {
      try {
        const activeUsers = await this.monitoringService.getActiveUserStats();
        res.json({
          status: 'success',
          timestamp: new Date(),
          data: activeUsers
        });
      } catch (error) {
        next(error);
      }
    }
  
    async getResourceUsage(req, res, next) {
      try {
        const resources = await this.monitoringService.getResourceUsage();
        res.json({
          status: 'success',
          timestamp: new Date(),
          data: resources
        });
      } catch (error) {
        next(error);
      }
    }
  
    async getApiUsage(req, res, next) {
      try {
        const usageData = {
          metrics: Object.fromEntries(this.monitoringService.apiMetrics.usage),
          trends: Object.fromEntries(this.monitoringService.apiMetrics.trends),
          quotas: Object.fromEntries(this.monitoringService.apiMetrics.quotas)
        };
        res.json({
          status: 'success',
          timestamp: new Date(),
          data: usageData
        });
      } catch (error) {
        next(error);
      }
    }
  
    async setApiQuota(req, res, next) {
      try {
        const { endpoint, method, limit } = req.body;
        this.monitoringService.setApiQuota(endpoint, method, limit);
        res.json({
          status: 'success',
          message: 'Quota updated successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  
    async analyzeResources(req, res, next) {
      try {
        const analysis = await this.monitoringService.analyzeResourceUtilization();
        res.json({
          status: 'success',
          timestamp: new Date(),
          data: analysis
        });
      } catch (error) {
        next(error);
      }
    }
  }
  
  module.exports = new MonitoringController();