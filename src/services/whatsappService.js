// src/services/whatsappService.js
const axios = require('axios');
const config = require('@config/config');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Message, Template, NotificationLog } = require('@models');

class WhatsAppService {
  constructor() {
    this.client = axios.create({
      baseURL: config.whatsapp.apiUrl,
      headers: {
        Authorization: `Bearer ${config.whatsapp.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Message template cache
    this.templateCache = new Map();
  }

  /**
   * Send a WhatsApp message using a predefined template
   */
  async sendTemplateMessage(phoneNumber, templateName, parameters, options = {}) {
    try {
      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new AppError('Invalid phone number format', 400);
      }

      // Get template from cache or database
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new AppError(`Template ${templateName} not found`, 404);
      }

      // Replace template parameters
      const message = this.replaceTemplateParameters(template.content, parameters);

      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: options.language || 'en'
          },
          components: this.formatTemplateComponents(parameters)
        }
      });

      // Log the notification
      await NotificationLog.create({
        type: 'WHATSAPP',
        recipient: formattedPhone,
        templateName,
        parameters,
        status: 'SENT',
        messageId: response.data.messages[0].id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send WhatsApp template message:', error);
      
      // Log failed notification
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
   */
  async sendCustomMessage(phoneNumber, message, options = {}) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new AppError('Invalid phone number format', 400);
      }

      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        },
        ...options
      });

      // Log the notification
      await NotificationLog.create({
        type: 'WHATSAPP_CUSTOM',
        recipient: formattedPhone,
        content: message,
        status: 'SENT',
        messageId: response.data.messages[0].id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send custom WhatsApp message:', error);
      
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

      return await this.sendTemplateMessage(
        order.customer.phoneNumber,
        templateName,
        parameters
      );
    } catch (error) {
      logger.error('Failed to send order update:', error);
      throw new AppError('Failed to send order update', 500);
    }
  }

  /**
   * Send booking confirmation to customer
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

      return await this.sendTemplateMessage(
        booking.customer.phoneNumber,
        'booking_confirmation',
        parameters
      );
    } catch (error) {
      logger.error('Failed to send booking confirmation:', error);
      throw new AppError('Failed to send booking confirmation', 500);
    }
  }

  /**
   * Send driver assignment notification
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

      return await this.sendTemplateMessage(
        order.customer.phoneNumber,
        'driver_assigned',
        parameters
      );
    } catch (error) {
      logger.error('Failed to send driver assignment notification:', error);
      throw new AppError('Failed to send driver assignment notification', 500);
    }
  }

  /**
   * Initialize message templates
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
      logger.error('Failed to initialize WhatsApp templates:', error);
      throw error;
    }
  }

  /**
   * Get template from cache or database
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
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming default country code)
    if (cleaned.length === 9) {
      return `+${config.whatsapp.defaultCountryCode}${cleaned}`;
    }

    // Return as is if already has country code
    if (cleaned.length >= 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    return null;
  }

  /**
   * Replace template parameters in message content
   */
  replaceTemplateParameters(content, parameters) {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return parameters[key] || match;
    });
  }

  /**
   * Format template components for WhatsApp API
   */
  formatTemplateComponents(parameters) {
    return Object.entries(parameters).map(([key, value]) => ({
      type: 'body',
      parameters: [{
        type: 'text',
        text: value
      }]
    }));
  }
}

module.exports = new WhatsAppService();