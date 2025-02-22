// @validators/merchantValidators/profileValidators/addressValidator.js
const Joi = require('joi');

exports.addressSuggestionSchema = Joi.object({
  query: Joi.object({
    input: Joi.string().required().min(3).max(100)
      .messages({
        'string.empty': 'Search input cannot be empty',
        'string.min': 'Search input must be at least 3 characters long',
        'string.max': 'Search input cannot exceed 100 characters'
      })
  })
});

exports.addressDetailsSchema = Joi.object({
  params: Joi.object({
    placeId: Joi.string().required()
      .messages({
        'string.empty': 'Place ID is required',
        'any.required': 'Place ID is required'
      })
  })
});

exports.validateAddressUpdate = (req, res, next) => {
  const schema = Joi.object({
    placeId: Joi.string().required(),
    formattedAddress: Joi.string().required(),
    location: Joi.object({
      lat: Joi.number().required().min(-90).max(90),
      lng: Joi.number().required().min(-180).max(180)
    }).required()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  next();
};