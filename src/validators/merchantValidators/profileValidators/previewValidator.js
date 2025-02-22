// src/validators/merchantValidators/profileValidators/previewValidator.js
const Joi = require('joi');
const libphonenumber = require('google-libphonenumber');

const previewUpdateSchema = Joi.object({
  business_name: Joi.string().min(2).max(100),
  address: Joi.string().min(5).max(200),
  phone_number: Joi.string().custom((value, helpers) => {
    const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
    try {
      const number = phoneUtil.parse(value);
      if (!phoneUtil.isValidNumber(number)) {
        return helpers.error('Invalid phone number format');
      }
      return value;
    } catch (error) {
      return helpers.error('Invalid phone number format');
    }
  }),
  currency: Joi.string().length(3),
  time_zone: Joi.string(),
  business_hours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }),
  notification_preferences: Joi.object({
    orderUpdates: Joi.boolean(),
    bookingNotifications: Joi.boolean(),
    customerFeedback: Joi.boolean(),
    marketingMessages: Joi.boolean()
  }),
  whatsapp_enabled: Joi.boolean(),
  service_radius: Joi.number().min(0),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }),
  logoUrl: Joi.string().uri().allow(null),
  bannerUrl: Joi.string().uri().allow(null),
  storefrontUrl: Joi.string().uri().allow(null),
  delivery_area: Joi.object({
    type: Joi.string().valid('Polygon', 'Circle').required(),
    coordinates: Joi.alternatives().conditional('type', {
      is: 'Polygon',
      then: Joi.array().items(Joi.array().items(Joi.array().items(Joi.number()).length(2))),
      otherwise: Joi.object({
        center: Joi.array().items(Joi.number()).length(2),
        radius: Joi.number().positive()
      })
    })
  })
}).min(1); // Require at least one field to be present

exports.validatePreviewUpdate = (data) => previewUpdateSchema.validate(data, {
  abortEarly: false,
  stripUnknown: true
});