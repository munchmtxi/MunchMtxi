// src/validators/paymentValidators.js
const Joi = require('joi');
const { PAYMENT_CONSTANTS } = require('../config/constants');

// Extract valid providers from constants
const VALID_MOBILE_MONEY_PROVIDERS = Object.values(PAYMENT_CONSTANTS.PROVIDERS.MOBILE_MONEY);
const VALID_BANK_PROVIDERS = Object.values(PAYMENT_CONSTANTS.PROVIDERS.BANK_CARD);
const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_CONSTANTS.STATUS);

// Custom phone number validation for different providers
const phoneNumberPattern = /^\+?(255|265|254)\d{9}$/;  // Supports TZ, MW, and KE numbers

const mobileMoneySchema = Joi.object({
  amount: Joi.number()
    .positive()
    .max(PAYMENT_CONSTANTS.LIMITS.MOBILE_MONEY.TRANSACTION_MAX)
    .required()
    .messages({
      'number.max': `Amount cannot exceed ${PAYMENT_CONSTANTS.LIMITS.MOBILE_MONEY.TRANSACTION_MAX}`
    }),
  provider: Joi.string()
    .valid(...VALID_MOBILE_MONEY_PROVIDERS)
    .required()
    .messages({
      'any.only': 'Invalid mobile money provider'
    }),
  order_id: Joi.number()
    .integer()
    .positive()
    .required(),
  phone_number: Joi.string()
    .pattern(phoneNumberPattern)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid East African mobile number'
    }),
  customer_id: Joi.number()
    .integer()
    .positive()
    .required(),
  merchant_id: Joi.number()
    .integer()
    .positive()
    .required()
});

const bankCardSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .max(PAYMENT_CONSTANTS.LIMITS.BANK_CARD.TRANSACTION_MAX)
    .required()
    .messages({
      'number.max': `Amount cannot exceed ${PAYMENT_CONSTANTS.LIMITS.BANK_CARD.TRANSACTION_MAX}`
    }),
  provider: Joi.string()
    .valid(...VALID_BANK_PROVIDERS)
    .required()
    .messages({
      'any.only': 'Invalid bank provider'
    }),
  order_id: Joi.number()
    .integer()
    .positive()
    .required(),
  customer_id: Joi.number()
    .integer()
    .positive()
    .required(),
  merchant_id: Joi.number()
    .integer()
    .positive()
    .required(),
  card_details: Joi.object({
    card_number: Joi.string()
      .creditCard()
      .required()
      .messages({
        'string.creditCard': 'Invalid credit card number'
      }),
    expiry_date: Joi.string()
      .pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
      .required()
      .messages({
        'string.pattern.base': 'Expiry date must be in MM/YY format'
      }),
    cvv: Joi.string()
      .pattern(/^[0-9]{3,4}$/)
      .required()
      .messages({
        'string.pattern.base': 'CVV must be 3 or 4 digits'
      }),
    card_holder_name: Joi.string()
      .pattern(/^[a-zA-Z ]+$/)
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.pattern.base': 'Card holder name must contain only letters and spaces'
      })
  }).required()
});

const webhookSchema = Joi.object({
  provider: Joi.string()
    .valid(...VALID_MOBILE_MONEY_PROVIDERS, ...VALID_BANK_PROVIDERS)
    .required(),
  transaction_id: Joi.string()
    .allow(null),
  payment_id: Joi.string()
    .required(),
  status: Joi.string()
    .valid(...VALID_PAYMENT_STATUSES)
    .required(),
  amount: Joi.number()
    .positive(),
  reference: Joi.string(),
  metadata: Joi.object()
}).unknown(true); // Allow unknown fields for provider-specific data

// Helper validation middleware for Joi schemas
const validatePayment = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Import express-validator functions for route-specific validations
const { body, query, param } = require('express-validator');

const paymentValidators = {
  verifyPayment: [
    param('paymentId').isInt().withMessage('Valid payment ID is required')
  ],

  transactionReport: [
    query('startDate')
      .isISO8601()
      .withMessage('Valid start date is required'),
    query('endDate')
      .isISO8601()
      .withMessage('Valid end date is required')
      .custom((endDate, { req }) => {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ],

  reviewDecision: [
    param('paymentId').isInt().withMessage('Valid payment ID is required'),
    body('reason').isString().notEmpty().withMessage('Review reason is required'),
    body('notes').optional().isString()
  ],

  anomalyReport: [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('threshold')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Threshold must be between 0 and 100')
  ]
};

module.exports = {
  mobileMoneySchema,
  bankCardSchema,
  webhookSchema,
  validatePayment,
  paymentValidators
};
