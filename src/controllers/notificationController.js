// src/controllers/notificationController.js
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { NotificationLog, Template, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Notification Controller
 * Handles different types of notifications (WhatsApp, Email)
 */
const notificationController = {
  /**
   * Send WhatsApp notification using template
   */
  sendWhatsAppTemplate: catchAsync(async (req, res) => {
    const { phoneNumber, templateName, parameters } = req.body;

    if (!phoneNumber || !templateName) {
      throw new AppError('Phone number and template name are required', 400);
    }

    const result = await whatsappService.sendTemplateMessage(
      phoneNumber,
      templateName,
      parameters
    );

    res.status(200).json({
      status: 'success',
      message: 'WhatsApp notification sent successfully',
      data: result
    });
  }),

  /**
   * Send custom WhatsApp message (admin only)
   */
  sendCustomWhatsApp: catchAsync(async (req, res) => {
    const { phoneNumber, message } = req.body;

    // Check if user has admin privileges
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to send custom messages', 403);
    }

    if (!phoneNumber || !message) {
      throw new AppError('Phone number and message are required', 400);
    }

    const result = await whatsappService.sendCustomMessage(phoneNumber, message);

    res.status(200).json({
      status: 'success',
      message: 'Custom WhatsApp message sent successfully',
      data: result
    });
  }),

  /**
   * Send email using template
   */
  sendEmailTemplate: catchAsync(async (req, res) => {
    const { email, templateName, parameters } = req.body;

    if (!email || !templateName) {
      throw new AppError('Email and template name are required', 400);
    }

    const result = await emailService.sendTemplateEmail(
      email,
      templateName,
      parameters
    );

    res.status(200).json({
      status: 'success',
      message: 'Email sent successfully',
      data: result
    });
  }),

  /**
   * Send custom email (admin only)
   */
  sendCustomEmail: catchAsync(async (req, res) => {
    const { email, subject, text, html, attachments } = req.body;

    // Check if user has admin privileges
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to send custom emails', 403);
    }

    if (!email || (!text && !html)) {
      throw new AppError('Email and content are required', 400);
    }

    const result = await emailService.sendCustomEmail({
      to: email,
      subject,
      text,
      html,
      attachments
    });

    res.status(200).json({
      status: 'success',
      message: 'Custom email sent successfully',
      data: result
    });
  }),

  /**
   * Send bulk notifications using template
   */
  sendBulkNotifications: catchAsync(async (req, res) => {
    const { 
      recipients, 
      templateName, 
      parameters,
      channels = ['whatsapp', 'email']
    } = req.body;

    if (!recipients || !templateName) {
      throw new AppError('Recipients and template name are required', 400);
    }

    // Check if user has permission for bulk notifications
    if (!req.user.permissions.includes('SEND_BULK_NOTIFICATIONS')) {
      throw new AppError('Not authorized to send bulk notifications', 403);
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process recipients in batches
    for (const recipient of recipients) {
      try {
        if (channels.includes('whatsapp') && recipient.phoneNumber) {
          await whatsappService.sendTemplateMessage(
            recipient.phoneNumber,
            templateName,
            {
              ...parameters,
              recipientName: recipient.name
            }
          );
        }

        if (channels.includes('email') && recipient.email) {
          await emailService.sendTemplateEmail(
            recipient.email,
            templateName,
            {
              ...parameters,
              recipientName: recipient.name
            }
          );
        }

        results.successful.push(recipient);
      } catch (error) {
        logger.error(`Failed to send notification to recipient:`, {
          recipient,
          error: error.message
        });
        results.failed.push({
          recipient,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Bulk notifications processed',
      data: results
    });
  }),

  /**
   * Get notification templates
   */
  getTemplates: catchAsync(async (req, res) => {
    const templates = await Template.findAll({
      where: {
        status: 'ACTIVE',
        ...(req.query.type && { type: req.query.type.toUpperCase() })
      }
    });

    res.status(200).json({
      status: 'success',
      data: templates
    });
  }),

  /**
   * Get notification logs
   */
  getNotificationLogs: catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      type,
      status,
      recipient,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (recipient) where.recipient = recipient;

    const logs = await NotificationLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs: logs.rows,
        total: logs.count,
        page: parseInt(page),
        totalPages: Math.ceil(logs.count / limit)
      }
    });
  }),

  /**
   * Get notification statistics
   */
  getNotificationStats: catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = await NotificationLog.findAll({
      where: {
        ...(startDate && endDate && {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        })
      },
      attributes: [
        'type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type', 'status']
    });

    res.status(200).json({
      status: 'success',
      data: stats
    });
  }),

  /**
   * Retry failed notifications
   */
  retryFailedNotifications: catchAsync(async (req, res) => {
    const { notificationIds } = req.body;

    if (!req.user.permissions.includes('RETRY_NOTIFICATIONS')) {
      throw new AppError('Not authorized to retry notifications', 403);
    }

    const failedNotifications = await NotificationLog.findAll({
      where: {
        id: notificationIds,
        status: 'FAILED'
      }
    });

    const results = {
      successful: [],
      failed: []
    };

    for (const notification of failedNotifications) {
      try {
        if (notification.type === 'WHATSAPP') {
          await whatsappService.sendTemplateMessage(
            notification.recipient,
            notification.templateName,
            notification.parameters
          );
        } else if (notification.type === 'EMAIL') {
          await emailService.sendTemplateEmail(
            notification.recipient,
            notification.templateName,
            notification.parameters
          );
        }
        
        results.successful.push(notification.id);
      } catch (error) {
        logger.error(`Failed to retry notification:`, {
          notificationId: notification.id,
          error: error.message
        });
        results.failed.push({
          id: notification.id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Retry process completed',
      data: results
    });
  })
};

module.exports = notificationController;