// @validators/merchantValidators/profileValidators/merchant2FAValidator.js
const Joi = require('joi');

const schemas = {
  enable2FA: Joi.object({
    token: Joi.string()
      .required()
      .length(6)
      .pattern(/^[0-9]+$/)
      .messages({
        'string.empty': 'Token is required',
        'string.length': 'Token must be exactly 6 digits',
        'string.pattern.base': 'Token must contain only numbers'
      }),
    method: Joi.string()
      .valid('authenticator', 'sms', 'email', 'biometric')
      .default('authenticator')
      .messages({
        'any.only': 'Invalid 2FA method'
      })
  }),

  verify2FA: Joi.object({
    token: Joi.string()
      .required()
      .length(6)
      .pattern(/^[0-9]+$/)
      .messages({
        'string.empty': 'Token is required',
        'string.length': 'Token must be exactly 6 digits',
        'string.pattern.base': 'Token must contain only numbers'
      }),
    method: Joi.string()
      .valid('authenticator', 'sms', 'email', 'biometric', 'backup')
      .optional()
      .messages({
        'any.only': 'Invalid 2FA method'
      })
  }),

  updateMethod: Joi.object({
    newMethod: Joi.string()
      .required()
      .valid('authenticator', 'sms', 'email', 'biometric')
      .messages({
        'any.only': 'Invalid 2FA method'
      }),
    token: Joi.string()
      .required()
      .length(6)
      .pattern(/^[0-9]+$/)
      .messages({
        'string.empty': 'Current 2FA token is required',
        'string.length': 'Token must be exactly 6 digits',
        'string.pattern.base': 'Token must contain only numbers'
      })
  }),

  backupEmail: Joi.object({
    email: Joi.string()
      .required()
      .email()
      .messages({
        'string.email': 'Please provide a valid email address'
      })
  }),

  backupPhone: Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .messages({
        'string.pattern.base': 'Please provide a valid phone number in E.164 format'
      })
  })
};

const validate2FASetup = (req, res, next) => {
  const { error } = schemas.enable2FA.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }
  next();
};

const validate2FAVerification = (req, res, next) => {
  const { error } = schemas.verify2FA.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }
  next();
};

const validateMethodUpdate = (req, res, next) => {
  const { error } = schemas.updateMethod.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }
  next();
};

const validateBackupEmail = (req, res, next) => {
  const { error } = schemas.backupEmail.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }
  next();
};

const validateBackupPhone = (req, res, next) => {
  const { error } = schemas.backupPhone.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }
  next();
};

module.exports = {
  validate2FASetup,
  validate2FAVerification,
  validateMethodUpdate,
  validateBackupEmail,
  validateBackupPhone
};