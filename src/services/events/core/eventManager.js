// src/services/events/core/eventManager.js
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

class EventManager {
  constructor() {
    this.eventQueue = new Map();
    this.listeners = new Map();
    this.notificationService = null; // Store notification service instance
    this.retryConfig = {
      maxRetries: 3,
      backoffMs: 1000, // Start with 1 second
      maxBackoffMs: 10000 // Max 10 seconds
    };
  }

  /**
   * Sets the notification service instance for sending notifications.
   * @param {Object} service - The notification service instance.
   */
  setNotificationService(service) {
    this.notificationService = service;
    logger.info('Notification service set in EventManager', { type: typeof service });
  }

  /**
   * Registers an event handler.
   * @param {string} eventName - The name of the event.
   * @param {Function} handler - The handler function to execute when the event is emitted.
   */
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(handler);
    logger.info(`Event listener registered for ${eventName}`);
  }

  /**
   * Emits an event to all registered listeners.
   * @param {string} eventName - The name of the event.
   * @param {object} data - The data to pass to the listeners.
   */
  emit(eventName, data) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in event handler for ${eventName}:`, {
            error: error.message,
            eventData: data
          });
        }
      });
    } else {
      logger.warn(`No listeners registered for event: ${eventName}`, { data });
    }
  }

  /**
   * Handles an event with retry logic.
   * @param {string} eventId - Unique identifier for the event.
   * @param {string} eventName - The name of the event.
   * @param {object} payload - The event payload.
   * @param {Socket} socket - The Socket.IO socket instance.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   */
  async handleEvent(eventId, eventName, payload, socket, io) {
    try {
      this.eventQueue.set(eventId, {
        eventName,
        payload,
        retryCount: 0,
        status: 'pending',
        timestamp: Date.now()
      });

      logger.info('Event received', {
        eventId,
        eventName,
        userId: socket?.user?.id,
        timestamp: new Date().toISOString()
      });

      await this.processEvent(eventId, eventName, payload, socket, io);
    } catch (error) {
      await this.handleEventError(eventId, eventName, error, socket, io);
    }
  }

  /**
   * Processes an event by emitting it to listeners and optionally sending a notification.
   * @param {string} eventId - The event ID.
   * @param {string} eventName - The event name.
   * @param {object} payload - The event payload.
   * @param {Socket} socket - The Socket.IO socket instance.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   */
  async processEvent(eventId, eventName, payload, socket, io) {
    const event = this.eventQueue.get(eventId);

    try {
      event.status = 'processing';
      this.eventQueue.set(eventId, event);

      await this.emit(eventName, { eventId, payload, socket, io });

      // If payload includes notification data and notificationService is set, send notification
      if (this.notificationService && payload.notification) {
        await this.notificationService.sendThroughChannel(payload.notification.type, {
          notification: payload.notification,
          content: payload.content,
          recipient: payload.recipient
        });
        logger.info('Notification sent via EventManager', { eventName, recipient: payload.recipient });
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
      throw new AppError(`Failed to process event ${eventName}`, 500, 'EVENT_PROCESSING_ERROR', null, { eventId, payload });
    }
  }

  /**
   * Handles errors during event processing with retry logic.
   * @param {string} eventId - The event ID.
   * @param {string} eventName - The event name.
   * @param {Error} error - The error that occurred.
   * @param {Socket} socket - The Socket.IO socket instance.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   */
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

  /**
   * Handles final failure of an event after max retries.
   * @param {string} eventId - The event ID.
   * @param {string} eventName - The event name.
   * @param {Error} error - The error that occurred.
   * @param {Socket} socket - The Socket.IO socket instance.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   */
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
      socket.emit('EVENT_ERROR', {
        message: 'Event processing failed',
        eventName,
        eventId
      });
    }

    await this.moveToDeadLetterQueue(eventId, event);
  }

  /**
   * Moves a failed event to a dead letter queue.
   * @param {string} eventId - The event ID.
   * @param {object} event - The event data.
   */
  async moveToDeadLetterQueue(eventId, event) {
    logger.info('Moving event to dead letter queue', {
      eventId,
      event: { ...event, movedToDLQAt: new Date().toISOString() }
    });
    // Placeholder for actual DLQ implementation (e.g., save to DB or external queue)
  }

  /**
   * Gets the status of an event.
   * @param {string} eventId - The event ID.
   * @returns {object} - The event data.
   */
  getEventStatus(eventId) {
    return this.eventQueue.get(eventId);
  }
}

module.exports = new EventManager();