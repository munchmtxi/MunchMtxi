const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      'https://api.whatsapp.com/send',
      {
        phone: phoneNumber,
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Failed to send WhatsApp message:', error);
    throw new AppError('Failed to send WhatsApp message', 500);
  }
};

module.exports = { sendWhatsAppMessage };