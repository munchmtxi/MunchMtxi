// src/validators/merchantValidators/profileValidators/imageValidator.js
const Joi = require('joi');

// Image type validation
const validateImageType = Joi.object({
  type: Joi.string()
    .valid('logo', 'banner', 'storefront')
    .required()
    .messages({
      'string.valid': 'Image type must be either logo, banner, or storefront',
      'any.required': 'Image type is required'
    })
});

// Image file validation
const validateImageFile = (file) => {
  if (!file) {
    return { error: { message: 'No file uploaded' } };
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedMimes.includes(file.mimetype)) {
    return { error: { message: 'Invalid file type. Only JPG, PNG and GIF allowed' } };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { error: { message: 'File too large. Maximum size is 5MB' } };
  }

  return { value: file };
};

module.exports = {
  validateImageType,
  validateImageFile
};