// src/validators/2faValidators.js
const { body, validationResult } = require('express-validator');

const validate2FASetup = [
  // Add any necessary validations for 2FA setup if needed
  (req, res, next) => {
    next();
  },
];

const validate2FAVerify = [
  body('token').notEmpty().withMessage('2FA token is required'),
  // Additional validations...
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'fail', errors: errors.array() });
    }
    next();
  },
];

module.exports = { validate2FASetup, validate2FAVerify };
