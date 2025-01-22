const { sendWhatsAppMessage } = require('../services/whatsappService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const sendNotification = catchAsync(async (req, res) => {
  const { phoneNumber, message } = req.body;
  await sendWhatsAppMessage(phoneNumber, message);
  res.status(200).json({
    status: 'success',
    message: 'WhatsApp notification sent successfully',
  });
});

module.exports = { sendNotification };