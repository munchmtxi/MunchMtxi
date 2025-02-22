// @validators/merchantValidators/profileValidators/passwordValidator.js
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');

const complexityOptions = {
  min: 8,
  max: 30,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 1,
  requirementCount: 4,
};

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required'
    }),
  newPassword: passwordComplexity(complexityOptions)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'any.invalid': 'New password must be different from current password',
      'passwordComplexity.tooShort': 'Password must be at least 8 characters',
      'passwordComplexity.tooLong': 'Password cannot exceed 30 characters',
      'passwordComplexity.lowercase': 'Password must contain at least one lowercase letter',
      'passwordComplexity.uppercase': 'Password must contain at least one uppercase letter',
      'passwordComplexity.numeric': 'Password must contain at least one number',
      'passwordComplexity.symbol': 'Password must contain at least one special character'
    })
});

const validatePasswordChange = (req, res, next) => {
  const { error } = passwordChangeSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(detail => detail.message).join(', ')
    });
  }

  next();
};

const calculateStrength = (password) => {
  let score = 0;
  
  // Length-based scoring
  if (password.length >= 12) score += 25;
  else if (password.length >= 8) score += 10;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  
  // Pattern detection (negative scoring)
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Letters only
  if (/^[0-9]+$/.test(password)) score -= 10; // Numbers only
  
  return Math.max(0, Math.min(100, score));
};

const getStrengthRecommendations = (strength) => {
  const recommendations = [];
  
  if (strength < 50) {
    recommendations.push('Consider using a longer password');
    recommendations.push('Add numbers and special characters');
  } else if (strength < 80) {
    recommendations.push('Add more variety of characters');
    recommendations.push('Increase password length for better security');
  }
  
  return recommendations;
};

module.exports = {
  validatePasswordChange,
  calculateStrength,
  getStrengthRecommendations
};