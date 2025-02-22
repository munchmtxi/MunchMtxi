// src/handlers/merchantHandlers/profileHandlers/performanceMetricsHandler.js
const { EVENTS } = require('@config/events');
const { logger } = require('@utils/logger');
const performanceMetricsService = require('@services/merchantServices/profileServices/performanceMetricsService');

class PerformanceMetricsHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.user?.id;
    this.merchantId = socket.user?.merchantId;
  }

  initialize() {
    this.registerListeners();
    this.joinMetricsRoom();
  }

  registerListeners() {
    // Subscribe to metrics updates
    this.socket.on(EVENTS.MERCHANT.METRICS.SUBSCRIBE, this.handleSubscribe.bind(this));
    this.socket.on(EVENTS.MERCHANT.METRICS.UNSUBSCRIBE, this.handleUnsubscribe.bind(this));

    // Real-time metric requests
    this.socket.on(EVENTS.MERCHANT.METRICS.GET_LIVE, this.handleGetLiveMetrics.bind(this));
    this.socket.on(EVENTS.MERCHANT.METRICS.GET_PERIOD, this.handleGetPeriodMetrics.bind(this));
  }

  async joinMetricsRoom() {
    try {
      const roomId = `merchant:${this.merchantId}:metrics`;
      await this.socket.join(roomId);
      
      logger.info('Joined metrics room', {
        userId: this.userId,
        merchantId: this.merchantId,
        room: roomId
      });
    } catch (error) {
      logger.error('Error joining metrics room:', {
        userId: this.userId,
        merchantId: this.merchantId,
        error: error.message
      });
    }
  }

  async handleSubscribe(data) {
    try {
      const { metricTypes = ['all'] } = data;
      
      // Join specific metric type rooms if specified
      if (metricTypes.includes('all')) {
        await this.socket.join(`merchant:${this.merchantId}:metrics:all`);
      } else {
        for (const type of metricTypes) {
          await this.socket.join(`merchant:${this.merchantId}:metrics:${type}`);
        }
      }

      this.socket.emit(EVENTS.MERCHANT.METRICS.SUBSCRIBED, {
        status: 'success',
        metricTypes
      });

      logger.info('Subscribed to metrics:', {
        userId: this.userId,
        merchantId: this.merchantId,
        metricTypes
      });

    } catch (error) {
      this.handleError('Subscribe Error', error);
    }
  }

  async handleUnsubscribe(data) {
    try {
      const { metricTypes = ['all'] } = data;
      
      if (metricTypes.includes('all')) {
        await this.socket.leave(`merchant:${this.merchantId}:metrics:all`);
      } else {
        for (const type of metricTypes) {
          await this.socket.leave(`merchant:${this.merchantId}:metrics:${type}`);
        }
      }

      this.socket.emit(EVENTS.MERCHANT.METRICS.UNSUBSCRIBED, {
        status: 'success',
        metricTypes
      });

    } catch (error) {
      this.handleError('Unsubscribe Error', error);
    }
  }

  async handleGetLiveMetrics() {
    try {
      const metrics = await performanceMetricsService.getPerformanceMetrics(
        this.merchantId,
        'hourly'
      );

      this.socket.emit(EVENTS.MERCHANT.METRICS.LIVE_DATA, {
        status: 'success',
        data: metrics
      });

    } catch (error) {
      this.handleError('Live Metrics Error', error);
    }
  }

  async handleGetPeriodMetrics(data) {
    try {
      const { periodType, startDate, endDate } = data;
      
      const metrics = await performanceMetricsService.getPerformanceMetrics(
        this.merchantId,
        periodType,
        new Date(startDate),
        new Date(endDate)
      );

      this.socket.emit(EVENTS.MERCHANT.METRICS.PERIOD_DATA, {
        status: 'success',
        data: metrics
      });

    } catch (error) {
      this.handleError('Period Metrics Error', error);
    }
  }

  handleError(context, error) {
    logger.error(`${context}:`, {
      userId: this.userId,
      merchantId: this.merchantId,
      error: error.message
    });

    this.socket.emit(EVENTS.ERROR.METRICS.ERROR, {
      context,
      message: error.message
    });
  }

  // Static method for updating metrics for all subscribers
  static broadcastMetricsUpdate(io, merchantId, metricType, data) {
    const rooms = [
      `merchant:${merchantId}:metrics:all`,
      `merchant:${merchantId}:metrics:${metricType}`
    ];

    rooms.forEach(room => {
      io.to(room).emit(EVENTS.MERCHANT.METRICS.UPDATED, {
        type: metricType,
        data
      });
    });
  }
}

// Factory function
module.exports = function createPerformanceMetricsHandler(io) {
  return {
    register: (socket) => {
      const handler = new PerformanceMetricsHandler(io, socket);
      handler.initialize();
      return handler;
    }
  };
};