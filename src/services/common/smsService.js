// src/services/smsService.js
const africastalking = require('africastalking');
const { NotificationLog } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

class SMSService {
  constructor() {
    // Initialize Africa's Talking with your env variables
    this.client = africastalking({
      apiKey: process.env.SMS_API_KEY,
      username: process.env.SMS_SENDER_ID // Africa's Talking uses the sender ID as username
    });
    this.sms = this.client.SMS;
  }

  async sendSMS(phoneNumber, message, templateName = null) {
    try {
      const result = await this.sms.send({
        to: phoneNumber,
        message: message,
        from: process.env.SMS_SENDER_ID
      });

      await this.logSMSAttempt({
        recipient: phoneNumber,
        templateName,
        status: 'SENT',
        message_id: result.SMSMessageData.Recipients[0].messageId,
        provider: process.env.SMS_PROVIDER
      });

      return result;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      
      await this.logSMSAttempt({
        recipient: phoneNumber,
        templateName,
        status: 'FAILED',
        error: error.message,
        provider: process.env.SMS_PROVIDER
      });

      throw new AppError('Failed to send SMS', 500);
    }
  }

  async logSMSAttempt({
    recipient,
    templateName,
    status,
    message_id = null,
    error = null,
    provider
  }) {
    await NotificationLog.create({
      type: 'SMS',
      recipient,
      templateName,
      status,
      message_id,
      error,
      content: `Provider: ${provider}`
    });
  }

  async getDeliveryStats(startDate, endDate) {
    return await NotificationLog.findAll({
      where: {
        type: 'SMS',
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
  }
}

module.exports = SMSService;