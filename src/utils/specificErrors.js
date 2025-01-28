// /utils/specificErrors.js
const AppError = require('./AppError');

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

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};
