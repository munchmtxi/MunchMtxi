// @handlers/merchantHandlers/profileHandlers/passwordHandler.js
const merchantPasswordService = require('@services/merchantServices/profileServices/merchantPasswordService');
const logger = require('@utils/logger');

class MerchantPasswordHandler {
  async handlePasswordChange(socket, data) {
    try {
      const { currentPassword, newPassword } = data;
      const merchantId = socket.user.id;
      const clientIp = socket.handshake.address;

      const result = await merchantPasswordService.changePassword(
        merchantId,
        { currentPassword, newPassword },
        clientIp
      );

      socket.emit('merchant:password:changed', {
        status: 'success',
        message: 'Password updated successfully'
      });

      // Notify all merchant's active sessions about the password change
      socket.to(`merchant:${merchantId}`).emit('merchant:password:changed', {
        status: 'success',
        message: 'Your password was changed from another session'
      });

    } catch (error) {
      logger.error('Password change failed:', error);
      socket.emit('merchant:password:error', {
        status: 'error',
        message: error.message
      });
    }
  }

  async handlePasswordHistoryRequest(socket) {
    try {
      const merchantId = socket.user.id;
      const history = await merchantPasswordService.getPasswordHistory(merchantId);

      socket.emit('merchant:password:history', {
        status: 'success',
        data: history
      });

    } catch (error) {
      logger.error('Password history request failed:', error);
      socket.emit('merchant:password:error', {
        status: 'error',
        message: error.message
      });
    }
  }

  async handlePasswordStrengthRequest(socket) {
    try {
      const merchantId = socket.user.id;
      const strengthInfo = await merchantPasswordService.getPasswordStrength(merchantId);

      socket.emit('merchant:password:strength', {
        status: 'success',
        data: strengthInfo
      });

    } catch (error) {
      logger.error('Password strength request failed:', error);
      socket.emit('merchant:password:error', {
        status: 'error',
        message: error.message
      });
    }
  }

  async handleAccountLockNotification(socket, merchantId) {
    socket.to(`merchant:${merchantId}`).emit('merchant:password:locked', {
      status: 'warning',
      message: 'Your account has been temporarily locked due to multiple failed password attempts'
    });
  }

  registerHandlers(socket) {
    socket.on('merchant:password:change', this.handlePasswordChange.bind(this, socket));
    socket.on('merchant:password:getHistory', this.handlePasswordHistoryRequest.bind(this, socket));
    socket.on('merchant:password:getStrength', this.handlePasswordStrengthRequest.bind(this, socket));
  }
}

module.exports = new MerchantPasswordHandler();