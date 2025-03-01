const SMSService = require('@services/smsService');
const NotificationService = require('@services/notificationService');
const EventManager = require('@services/eventManager');
const { setupSocket } = require('./socket');

module.exports = {
  setupServices: (server) => {
    const io = setupSocket(server);
    const smsService = new SMSService();
    const notificationService = new NotificationService(io, smsService);
    EventManager.setNotificationService(notificationService);
    return { io, notificationService };
  }
};