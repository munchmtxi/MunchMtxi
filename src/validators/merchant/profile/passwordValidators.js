// src/validators/merchant/profile/passwordValidators.js
'use strict';

class PasswordValidators {
  calculateStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[!@#$%^&*]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  }

  async validateNewPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }
}

module.exports = new PasswordValidators();