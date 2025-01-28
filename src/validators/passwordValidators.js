// src/validators/passwordValidators.js
const { body, validationResult } = require('express-validator');

const validateForgotPassword = [
  body('email').isEmail().withMessage('Provide a valid email'),
  // Additional validations...
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'fail', errors: errors.array() });
    }
    next();
  },
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  // Additional validations...
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'fail', errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateForgotPassword, validateResetPassword };
