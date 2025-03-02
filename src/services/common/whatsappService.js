// src/services/common/whatsappService.js
const twilio = require('twilio');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Message, Template, NotificationLog } = require('@models');

class WhatsAppService {
  constructor() {
    const { twilioAccountSid, twilioAuthToken, twilioWhatsappNumber } = config.whatsapp;
    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappNumber) {
      logger.error('Twilio configuration missing', {
        twilioAccountSid: !!twilioAccountSid,
        twilioAuthToken: !!twilioAuthToken,
        twilioWhatsappNumber: !!twilioWhatsappNumber
      });
      throw new AppError('Twilio configuration missing', 500);
    }
    this.client = twilio(twilioAccountSid, twilioAuthToken);
    this.fromNumber = `whatsapp:${twilioWhatsappNumber}`;
    this.templateCache = new Map();
  }

  /**
   * Send a WhatsApp message using a predefined template
   * @param {string} phoneNumber - Recipient phone number (e.g., '+1234567890')
   * @param {string} templateName - Name of the template
   * @param {Object} parameters - Parameters to replace in the template
   * @param {Object} [options={}] - Additional options (e.g., language)
   * @returns {Promise<Object>} Twilio response
   */
  async sendTemplateMessage(phoneNumber, templateName, parameters, options = {}) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new AppError('Invalid phone number format', 400);
      }

      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new AppError(`Template ${templateName} not found`, 404);
      }

      const messageBody = this.replaceTemplateParameters(template.content, parameters);

      const response = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${formattedPhone}`,
        body: messageBody
      });

      await NotificationLog.create({
        type: 'WHATSAPP',
        recipient: formattedPhone,
        templateName,
        parameters,
        status: 'SENT',
        messageId: response.sid
      });

      logger.info('WhatsApp template message sent', { phoneNumber, templateName, messageId: response.sid });
      return { messageId: response.sid, status: response.status };
    } catch (error) {
      logger.error('Failed to send WhatsApp template message:', { error: error.message, phoneNumber, templateName });
      await NotificationLog.create({
        type: 'WHATSAPP',
        recipient: phoneNumber,
        templateName,
        parameters,
        status: 'FAILED',
        error: error.message
      });
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  /**
   * Send a custom WhatsApp message (for admin/support use)
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message content
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Twilio response
   */
  async sendCustomMessage(phoneNumber, message, options = {}) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new AppError('Invalid phone number format', 400);
      }

      const response = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${formattedPhone}`,
        body: message,
        ...options
      });

      await NotificationLog.create({
        type: 'WHATSAPP_CUSTOM',
        recipient: formattedPhone,
        content: message,
        status: 'SENT',
        messageId: response.sid
      });

      logger.info('Custom WhatsApp message sent', { phoneNumber, messageId: response.sid });
      return { messageId: response.sid, status: response.status };
    } catch (error) {
      logger.error('Failed to send custom WhatsApp message:', { error: error.message, phoneNumber });
      await NotificationLog.create({
        type: 'WHATSAPP_CUSTOM',
        recipient: phoneNumber,
        content: message,
        status: 'FAILED',
        error: error.message
      });
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  /**
   * Send order updates to customer
   * @param {string} orderId - Order ID
   * @param {string} status - Order status
   * @param {Object} [details={}] - Additional details
   * @returns {Promise<Object>} Twilio response
   */
  async sendOrderUpdate(orderId, status, details = {}) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['customer', 'merchant']
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const templateMap = {
        'CONFIRMED': 'order_confirmed',
        'PREPARING': 'order_preparing',
        'READY': 'order_ready',
        'OUT_FOR_DELIVERY': 'order_out_for_delivery',
        'DELIVERED': 'order_delivered',
        'CANCELLED': 'order_cancelled'
      };

      const templateName = templateMap[status];
      if (!templateName) {
        throw new AppError(`No template found for status: ${status}`, 400);
      }

      const parameters = {
        orderNumber: order.orderNumber,
        merchantName: order.merchant.businessName,
        ...details
      };

      return await this.sendTemplateMessage(order.customer.phoneNumber, templateName, parameters);
    } catch (error) {
      logger.error('Failed to send order update:', { error: error.message, orderId });
      throw new AppError('Failed to send order update', 500);
    }
  }

  /**
   * Send booking confirmation to customer
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Twilio response
   */
  async sendBookingConfirmation(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: ['customer', 'merchant']
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      const parameters = {
        bookingReference: booking.reference,
        merchantName: booking.merchant.businessName,
        bookingDate: booking.formatDate(),
        bookingTime: booking.formatTime()
      };

      return await this.sendTemplateMessage(booking.customer.phoneNumber, 'booking_confirmation', parameters);
    } catch (error) {
      logger.error('Failed to send booking confirmation:', { error: error.message, bookingId });
      throw new AppError('Failed to send booking confirmation', 500);
    }
  }

  /**
   * Send driver assignment notification
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Twilio response
   */
  async sendDriverAssigned(orderId) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['customer', 'driver']
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const parameters = {
        orderNumber: order.orderNumber,
        driverName: order.driver.name,
        estimatedArrival: order.estimatedArrival
      };

      return await this.sendTemplateMessage(order.customer.phoneNumber, 'driver_assigned', parameters);
    } catch (error) {
      logger.error('Failed to send driver assignment notification:', { error: error.message, orderId });
      throw new AppError('Failed to send driver assignment notification', 500);
    }
  }

  /**
   * Initialize message templates from the database
   */
  async initializeTemplates() {
    try {
      const templates = await Template.findAll({
        where: { type: 'WHATSAPP', status: 'ACTIVE' }
      });

      templates.forEach(template => {
        this.templateCache.set(template.name, template);
      });

      logger.info(`Initialized ${templates.length} WhatsApp templates`);
    } catch (error) {
      logger.error('Failed to initialize WhatsApp templates:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get template from cache or database
   * @param {string} templateName - Template name
   * @returns {Promise<Object|null>} Template object or null if not found
   */
  async getTemplate(templateName) {
    let template = this.templateCache.get(templateName);
    
    if (!template) {
      template = await Template.findOne({
        where: { 
          name: templateName,
          type: 'WHATSAPP',
          status: 'ACTIVE'
        }
      });

      if (template) {
        this.templateCache.set(templateName, template);
      }
    }

    return template;
  }

  /**
   * Format phone number to international format
   * @param {string} phoneNumber - Raw phone number
   * @returns {string|null} Formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10 && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    return cleaned.startsWith('+') && cleaned.length >= 11 ? cleaned : null;
  }

  /**
   * Replace template parameters in message content
   * @param {string} content - Template content
   * @param {Object} parameters - Parameters to replace
   * @returns {string} Formatted message
   */
  replaceTemplateParameters(content, parameters) {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return parameters[key] || match;
    });
  }
}

module.exports = new WhatsAppService();