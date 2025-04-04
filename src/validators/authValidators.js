// validators/authValidators.js
const Joi = require('joi');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    country: Joi.string().valid('malawi', 'zambia', 'mozambique', 'tanzania').required(),
    merchantType: Joi.string().valid('grocery', 'restaurant').optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const details = error.details.map(detail => detail.message);
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }

  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceInfo: Joi.object({
      deviceId: Joi.string().optional(),
      deviceType: Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
    }).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const details = error.details.map(detail => detail.message);
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }

  next();
};

const validateRegisterNonCustomer = (req, res, next) => {
  const schema = Joi.object({
    role: Joi.string().valid('Merchant', 'Staff', 'Driver').required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    country: Joi.string().valid('malawi', 'zambia', 'mozambique', 'tanzania').required(),
    merchantType: Joi.string().valid('grocery', 'restaurant').when('role', {
      is: 'Merchant',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const details = error.details.map(detail => detail.message);
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }

  next();
};

// Update the login validator to include rememberMe
const validateMerchantLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().uuid().required(),
    rememberMe: Joi.boolean().optional().default(false),
    deviceType: Joi.string().valid('mobile', 'desktop', 'tablet').required()
  });
  logger.info('Validating merchant login', { body: req.body });
  const { error } = schema.validate(req.body || {}, { abortEarly: false }); // Fallback to empty object
  if (error) {
    const details = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { errors: details });
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }
  logger.info('Validation passed');
  next();
};

const validateMerchantLogout = (req, res, next) => {
  const schema = Joi.object({
    deviceId: Joi.string().uuid().optional(),
    clearAllDevices: Joi.boolean().optional().default(false), // Option to logout from all devices
    rememberMe: Joi.boolean().optional().default(false)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => detail.message);
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }

  next();
};

// New validator for driver login
const validateDriverLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().uuid().required(),
    deviceType: Joi.string().valid('mobile', 'desktop', 'tablet').required()
  });
  logger.info('Validating driver login', { body: req.body });
  const { error } = schema.validate(req.body || {}, { abortEarly: false }); // Fallback to empty object
  if (error) {
    const details = error.details.map(detail => detail.message);
    logger.warn('Validation failed', { errors: details });
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }
  logger.info('Validation passed');
  next();
};

// New validator for driver logout
const validateDriverLogout = (req, res, next) => {
  const schema = Joi.object({
    deviceId: Joi.string().uuid().required()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => detail.message);
    return next(new AppError(`Validation Error: ${details.join('. ')}`, 400));
  }

  next();
};

module.exports = { 
  validateRegister, 
  validateLogin,
  validateRegisterNonCustomer,
  validateMerchantLogin,
  validateMerchantLogout,
  validateDriverLogin, 
  validateDriverLogout 
};