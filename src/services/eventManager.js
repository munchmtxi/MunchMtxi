const { logger } = require('@utils/logger');
const { EVENTS } = require('@config/events');

class EventManager {
  constructor() {
    this.eventQueue = new Map();
    this.retryConfig = {
      maxRetries: 3,
      backoffMs: 1000,  // Start with 1 second
      maxBackoffMs: 10000 // Max 10 seconds
    };
    this.notificationService = null;  // New: initialize notification service
  }

  // New method: Configure notification service
  setNotificationService(service) {
    this.notificationService = service;
    logger.info('Notification service configured for event manager');
  }

  // New event emitter functionality
  on(eventName, handler) {
    if (!this.eventQueue.has('listeners')) {
      this.eventQueue.set('listeners', new Map());
    }
    const listeners = this.eventQueue.get('listeners');
    if (!listeners.has(eventName)) {
      listeners.set(eventName, []);
    }
    listeners.get(eventName).push(handler);
  }

  emit(eventName, data) {
    const listeners = this.eventQueue.get('listeners');
    if (listeners && listeners.has(eventName)) {
      listeners.get(eventName).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  // Existing event handling methods
  async handleEvent(eventName, payload, socket, io) {
    const eventId = `${eventName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Event received', {
        eventId,
        eventName,
        userId: socket?.user?.id,
        timestamp: new Date().toISOString()
      });

      this.eventQueue.set(eventId, {
        eventName,
        payload,
        retryCount: 0,
        status: 'pending',
        timestamp: Date.now()
      });

      await this.processEvent(eventId, eventName, payload, socket, io);

    } catch (error) {
      await this.handleEventError(eventId, eventName, error, socket, io);
    }
  }

  async processEvent(eventId, eventName, payload, socket, io) {
    const event = this.eventQueue.get(eventId);
    
    try {
      event.status = 'processing';
      this.eventQueue.set(eventId, event);

      switch (eventName) {
        case EVENTS.ORDER.CREATED:
        case EVENTS.ORDER.UPDATED:
        case EVENTS.ORDER.CANCELLED:
          await this.handleOrderEvent(eventName, payload, socket, io);
          break;

        case EVENTS.PAYMENT.INITIATED:
        case EVENTS.PAYMENT.COMPLETED:
        case EVENTS.PAYMENT.FAILED:
          await this.handlePaymentEvent(eventName, payload, socket, io);
          break;

        case EVENTS.NOTIFICATION.SENT:
          await this.handleNotificationEvent(eventName, payload, socket, io);
          break;
      }

      event.status = 'completed';
      event.completedAt = Date.now();
      this.eventQueue.set(eventId, event);

      logger.info('Event processed successfully', {
        eventId,
        eventName,
        processingTime: Date.now() - event.timestamp
      });

    } catch (error) {
      throw error;
    }
  }

  async handleEventError(eventId, eventName, error, socket, io) {
    const event = this.eventQueue.get(eventId);
    
    logger.error('Event processing error', {
      eventId,
      eventName,
      error: error.message,
      retryCount: event.retryCount
    });

    if (event.retryCount < this.retryConfig.maxRetries) {
      const backoffTime = Math.min(
        this.retryConfig.backoffMs * Math.pow(2, event.retryCount),
        this.retryConfig.maxBackoffMs
      );

      event.status = 'retry-pending';
      event.retryCount++;
      event.nextRetryAt = Date.now() + backoffTime;
      this.eventQueue.set(eventId, event);

      setTimeout(async () => {
        try {
          await this.processEvent(eventId, eventName, event.payload, socket, io);
        } catch (retryError) {
          if (event.retryCount >= this.retryConfig.maxRetries) {
            await this.handleFinalError(eventId, eventName, retryError, socket, io);
          }
        }
      }, backoffTime);

    } else {
      await this.handleFinalError(eventId, eventName, error, socket, io);
    }
  }

  async handleFinalError(eventId, eventName, error, socket, io) {
    const event = this.eventQueue.get(eventId);
    
    event.status = 'failed';
    event.error = error.message;
    event.failedAt = Date.now();
    this.eventQueue.set(eventId, event);

    logger.error('Event failed permanently', {
      eventId,
      eventName,
      error: error.message,
      retryCount: event.retryCount,
      totalTime: Date.now() - event.timestamp
    });

    if (socket && socket.user) {
      socket.emit(EVENTS.ERROR, {
        message: 'Event processing failed',
        eventName,
        eventId
      });
    }

    await this.moveToDeadLetterQueue(eventId, event);
  }

  async moveToDeadLetterQueue(eventId, event) {
    logger.info('Moving event to dead letter queue', {
      eventId,
      event: {
        ...event,
        movedToDLQAt: new Date().toISOString()
      }
    });
  }

  async handleOrderEvent(eventName, payload, socket, io) {
    // Implement order-specific logic
  }

  async handlePaymentEvent(eventName, payload, socket, io) {
    // Implement payment-specific logic
  }

  async handleNotificationEvent(eventName, payload, socket, io) {
    // Implement notification-specific logic
  }

  getEventStatus(eventId) {
    return this.eventQueue.get(eventId);
  }

  getPendingEvents() {
    return Array.from(this.eventQueue.entries())
      .filter(([_, event]) => event.status === 'pending' || event.status === 'retry-pending');
  }

  getFailedEvents() {
    return Array.from(this.eventQueue.entries())
      .filter(([_, event]) => event.status === 'failed');
  }
}

const eventManager = new EventManager();
module.exports = eventManager;
