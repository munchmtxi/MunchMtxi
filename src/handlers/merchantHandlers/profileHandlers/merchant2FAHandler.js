// @handlers/merchantHandlers/profileHandlers/merchant2FAHandler.js

const EventEmitter = require('events');
const merchant2FAService = require('@services/merchantServices/profileServices/merchant2FAService');
const logger = require('@utils/logger');
const { socketEvents } = require('@config/events');

class Merchant2FAHandler extends EventEmitter {
  constructor() {
    super();
    this.service = merchant2FAService;
  }

  async handleSetup2FA(socket) {
    try {
      const merchantId = socket.user.id;
      const setupData = await this.service.setupAuthenticator(merchantId);

      socket.emit(socketEvents.merchant2FA.setupComplete, {
        status: 'success',
        data: setupData,
      });
    } catch (error) {
      logger.error('2FA Setup Error:', error);
      socket.emit(socketEvents.merchant2FA.error, {
        status: 'error',
        message: error.message,
      });
    }
  }

  async handleEnable2FA(socket, data) {
    try {
      const { token, method } = data;
      const merchantId = socket.user.id;

      const result = await this.service.enable2FA(merchantId, token, method);

      // Join the merchant's 2FA room for real-time updates
      socket.join(`merchant:${merchantId}:2fa`);

      socket.emit(socketEvents.merchant2FA.enabled, {
        status: 'success',
        data: result,
      });

      // Notify all merchant's devices
      socket.to(`merchant:${merchantId}:devices`).emit(socketEvents.merchant2FA.statusChanged, {
        status: 'enabled',
        method,
      });
    } catch (error) {
      logger.error('2FA Enable Error:', error);
      socket.emit(socketEvents.merchant2FA.error, {
        status: 'error',
        message: error.message,
      });
    }
  }

  async handleVerify2FA(socket, data) {
    try {
      const { token, method } = data;
      const merchantId = socket.user.id;

      await this.service.verify2FA(merchantId, token, method);

      socket.emit(socketEvents.merchant2FA.verified, {
        status: 'success',
        message: '2FA verification successful',
      });
    } catch (error) {
      logger.error('2FA Verification Error:', error);
      socket.emit(socketEvents.merchant2FA.error, {
        status: 'error',
        message: error.message,
      });
    }
  }

  async handleUpdateMethod(socket, data) {
    try {
      const { newMethod, token } = data;
      const merchantId = socket.user.id;

      const result = await this.service.updatePreferredMethod(merchantId, newMethod, token);

      socket.emit(socketEvents.merchant2FA.methodUpdated, {
        status: 'success',
        data: result,
      });

      // Notify all merchant's devices
      socket.to(`merchant:${merchantId}:devices`).emit(socketEvents.merchant2FA.statusChanged, {
        status: 'methodUpdated',
        method: newMethod,
      });
    } catch (error) {
      logger.error('2FA Method Update Error:', error);
      socket.emit(socketEvents.merchant2FA.error, {
        status: 'error',
        message: error.message,
      });
    }
  }

  async handleGenerateBackupCodes(socket, data) {
    try {
      const { token } = data;
      const merchantId = socket.user.id;

      const result = await this.service.generateNewBackupCodes(merchantId, token);

      socket.emit(socketEvents.merchant2FA.backupCodesGenerated, {
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Backup Codes Generation Error:', error);
      socket.emit(socketEvents.merchant2FA.error, {
        status: 'error',
        message: error.message,
      });
    }
  }

  async handleSuspiciousActivity(socket, merchantId) {
    try {
      socket.to(`merchant:${merchantId}:2fa`).emit(socketEvents.merchant2FA.suspiciousActivity, {
        status: 'warning',
        message: 'Suspicious activity detected on your account',
      });
    } catch (error) {
      logger.error('Suspicious Activity Notification Error:', error);
    }
  }

  async handleDisconnect(socket) {
    try {
      const merchantId = socket.user.id;
      socket.leave(`merchant:${merchantId}:2fa`);
    } catch (error) {
      logger.error('Socket Disconnect Error:', error);
    }
  }

  registerHandlers(socket) {
    socket.on(socketEvents.merchant2FA.setup, this.handleSetup2FA.bind(this, socket));
    socket.on(socketEvents.merchant2FA.enable, this.handleEnable2FA.bind(this, socket));
    socket.on(socketEvents.merchant2FA.verify, this.handleVerify2FA.bind(this, socket));
    socket.on(socketEvents.merchant2FA.updateMethod, this.handleUpdateMethod.bind(this, socket));
    socket.on(socketEvents.merchant2FA.generateBackupCodes, this.handleGenerateBackupCodes.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));
  }
}

module.exports = new Merchant2FAHandler();