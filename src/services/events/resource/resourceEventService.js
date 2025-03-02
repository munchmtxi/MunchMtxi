const eventManager = require('../core/eventManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class ResourceEventService {
  constructor() {
    this.resourceMetrics = [];
    eventManager.on('RESOURCE_UPDATE', this.handleResourceUpdate.bind(this));
  }

  /**
   * Handles the RESOURCE_UPDATE event for monitoring system resources.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handleResourceUpdate({ eventId, payload, socket, io }) {
    try {
      const { cpu, memory } = payload;
      if (cpu === undefined || memory === undefined) {
        throw new AppError('Missing resource metrics', 400, 'INVALID_RESOURCE_DATA');
      }

      const resourceMetrics = {
        timestamp: Date.now(),
        metrics: payload
      };

      // Store metrics for trend analysis
      this.resourceMetrics.push(resourceMetrics);

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      this.resourceMetrics = this.resourceMetrics.filter(
        (metric) => metric.timestamp > twentyFourHoursAgo
      );

      logger.info(`Resource update: ${eventId}`, { cpu, memory });

      // Emit alerts if thresholds are exceeded
      if (cpu > 80 || memory > 85) {
        eventManager.emit('RESOURCE_ALERT', {
          type: 'high_utilization',
          metrics: payload,
          timestamp: Date.now()
        });
        io.to('system:monitoring').emit('RESOURCE_ALERT', payload);
      }
    } catch (error) {
      logger.error('Failed to handle RESOURCE_UPDATE event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Gets the current resource metrics.
   * @returns {array} - Array of stored resource metrics.
   */
  getMetrics() {
    return this.resourceMetrics;
  }
}

module.exports = new ResourceEventService();