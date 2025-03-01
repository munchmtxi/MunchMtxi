// /utils/specificErrors.js
const AppError = require('@utils/AppError');

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You are not authorized to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity} not found`, 404, 'NOT_FOUND');
  }
}

class MerchantAuthenticationError extends AuthenticationError {
  constructor(message = 'Merchant authentication failed') {
    super(message);
    this.errorType = 'MERCHANT_AUTHENTICATION_ERROR';
  }
}

class MerchantAuthorizationError extends AuthorizationError {
  constructor(message = 'Merchant not authorized') {
    super(message);
    this.errorType = 'MERCHANT_AUTHORIZATION_ERROR';
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  MerchantAuthenticationError,
  MerchantAuthorizationError
};
