// src/services/emailService.js
const nodemailer = require('nodemailer');
const config = require('@config/config');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Template, NotificationLog } = require('@models');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });

    // Email template cache
    this.templateCache = new Map();
    
    // Default sender
    this.defaultFrom = {
      name: config.email.senderName || 'MunchMtxi',
      email: config.email.senderEmail || 'no-reply@munchmtxi.com'
    };
  }

  /**
   * Send email using a predefined template
   */
  async sendTemplateEmail(to, templateName, parameters, options = {}) {
    try {
      // Validate email format
      if (!this.isValidEmail(to)) {
        throw new AppError('Invalid email format', 400);
      }

      // Get template from cache or database
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new AppError(`Template ${templateName} not found`, 404);
      }

      // Replace template parameters
      const html = this.replaceTemplateParameters(template.content, parameters);
      const subject = this.replaceTemplateParameters(template.subject, parameters);

      const mailOptions = {
        from: options.from || `"${this.defaultFrom.name}" <${this.defaultFrom.email}>`,
        to,
        subject,
        html,
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log the notification
      await NotificationLog.create({
        type: 'EMAIL',
        recipient: to,
        templateName,
        parameters,
        status: 'SENT',
        messageId: info.messageId
      });

      return info;
    } catch (error) {
      logger.error('Failed to send template email:', error);
      
      // Log failed notification
      await NotificationLog.create({
        type: 'EMAIL',
        recipient: to,
        templateName,
        parameters,
        status: 'FAILED',
        error: error.message
      });

      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Send custom email (for admin/support use)
   */
  async sendCustomEmail(options) {
    try {
      if (!this.isValidEmail(options.to)) {
        throw new AppError('Invalid email format', 400);
      }

      const mailOptions = {
        from: options.from || `"${this.defaultFrom.name}" <${this.defaultFrom.email}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log the notification
      await NotificationLog.create({
        type: 'EMAIL_CUSTOM',
        recipient: options.to,
        subject: options.subject,
        status: 'SENT',
        messageId: info.messageId
      });

      return info;
    } catch (error) {
      logger.error('Failed to send custom email:', error);
      
      await NotificationLog.create({
        type: 'EMAIL_CUSTOM',
        recipient: options.to,
        subject: options.subject,
        status: 'FAILED',
        error: error.message
      });

      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderId) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ['customer', 'merchant', 'items']
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const parameters = {
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        merchantName: order.merchant.businessName,
        orderDate: order.formatDate(),
        orderTime: order.formatTime(),
        items: order.formatItems(),
        total: order.formatTotal(),
        currency: order.currency
      };

      return await this.sendTemplateEmail(
        order.customer.email,
        'order_confirmation',
        parameters
      );
    } catch (error) {
      logger.error('Failed to send order confirmation:', error);
      throw new AppError('Failed to send order confirmation', 500);
    }
  }

  /**
   * Send booking confirmation email
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
        customerName: booking.customer.name,
        merchantName: booking.merchant.businessName,
        bookingDate: booking.formatDate(),
        bookingTime: booking.formatTime(),
        guestCount: booking.guestCount,
        specialRequests: booking.specialRequests
      };

      return await this.sendTemplateEmail(
        booking.customer.email,
        'booking_confirmation',
        parameters
      );
    } catch (error) {
      logger.error('Failed to send booking confirmation:', error);
      throw new AppError('Failed to send booking confirmation', 500);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(userId, resetToken) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const parameters = {
        userName: user.name,
        resetLink: `${config.frontend.url}/reset-password?token=${resetToken}`,
        validityPeriod: '24 hours'
      };

      return await this.sendTemplateEmail(
        user.email,
        'password_reset',
        parameters
      );
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new AppError('Failed to send password reset email', 500);
    }
  }

  /**
   * Initialize email templates
   */
  async initializeTemplates() {
    try {
      const templates = await Template.findAll({
        where: { type: 'EMAIL', status: 'ACTIVE' }
      });

      templates.forEach(template => {
        this.templateCache.set(template.name, template);
      });

      logger.info(`Initialized ${templates.length} email templates`);
    } catch (error) {
      logger.error('Failed to initialize email templates:', error);
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
          type: 'EMAIL',
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
   * Replace template parameters in content
   */
  replaceTemplateParameters(content, parameters) {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return parameters[key] || match;
    });
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();