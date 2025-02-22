// src/validators/merchantValidators/profileValidators/businessTypeValidator.js

const Joi = require('joi');
const { BUSINESS_TYPES, BUSINESS_VALIDATION_RULES } = require('@config/constants/businessTypes');

// Helper function to create service types schema based on business type
const createServiceTypesSchema = (businessType) => {
  const typeConfig = BUSINESS_TYPES[businessType?.toUpperCase()];
  if (!typeConfig || !typeConfig.allowedServiceTypes) {
    throw new Error(`Invalid or missing configuration for business type: ${businessType}`);
  }
  return Joi.array()
    .items(Joi.string().valid(...typeConfig.allowedServiceTypes))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one service type is required',
      'any.only': `Invalid service type for business type ${businessType}`,
    });
};

// Helper function to create licenses schema based on business type
const createLicensesSchema = (businessType) => {
  const typeConfig = BUSINESS_TYPES[businessType?.toUpperCase()];
  if (!typeConfig || !typeConfig.requiredLicenses) {
    throw new Error(`Invalid or missing configuration for business type: ${businessType}`);
  }
  return Joi.array()
    .items(Joi.string().valid(...typeConfig.requiredLicenses))
    .min(typeConfig.requiredLicenses.length)
    .required()
    .messages({
      'array.min': `At least ${typeConfig.requiredLicenses.length} licenses are required`,
      'any.only': 'Invalid license type',
    });
};

// Schema for business type details with added safety checks
const businessTypeDetailsSchema = Joi.object({
  cuisine_type: Joi.when('business_type', {
    is: Joi.string().valid('restaurant', 'cafe'),
    then: Joi.array()
      .items(Joi.string().valid(...(BUSINESS_VALIDATION_RULES.cuisine_type?.options || [])))
      .min(1)
      .required(),
    otherwise: Joi.forbidden(),
  }).messages({
    'any.required': 'Cuisine type is required for restaurants and cafes',
  }),
  seating_capacity: Joi.when('business_type', {
    is: Joi.string().valid('restaurant', 'cafe'),
    then: Joi.number()
      .min(BUSINESS_VALIDATION_RULES.seating_capacity.min)
      .max(BUSINESS_VALIDATION_RULES.seating_capacity.max)
      .required(),
    otherwise: Joi.forbidden(),
  }),
  store_type: Joi.when('business_type', {
    is: 'grocery',
    then: Joi.array()
      .items(Joi.string().valid(...(BUSINESS_VALIDATION_RULES.store_type?.options || [])))
      .min(1)
      .required(),
    otherwise: Joi.forbidden(),
  }),
  meat_types: Joi.when('business_type', {
    is: 'butcher',
    then: Joi.array()
      .items(Joi.string().valid(...(BUSINESS_VALIDATION_RULES.meat_types?.options || [])))
      .min(1)
      .required(),
    otherwise: Joi.forbidden(),
  }),
  storage_types: Joi.when('business_type', {
    is: Joi.string().valid('grocery', 'butcher'),
    then: Joi.array()
      .items(Joi.string().valid(...(BUSINESS_VALIDATION_RULES.storage_types?.options || [])))
      .min(1)
      .required(),
    otherwise: Joi.forbidden(),
  }),
  operating_hours: Joi.object({
    weekdays: Joi.array()
      .items(Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
      .length(2)
      .required(),
    weekends: Joi.array()
      .items(Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
      .length(2)
      .required(),
  }).required(),
  delivery_options: Joi.object({
    self_delivery: Joi.boolean().required(),
    third_party: Joi.boolean().required(),
    minimum_order: Joi.number().min(0),
    delivery_radius: Joi.number().min(0),
  }).required(),
}).required();

// Main schema for business type update
const businessTypeUpdateSchema = Joi.object({
  business_type: Joi.string()
    .valid(...Object.values(BUSINESS_TYPES).map((type) => type.code))
    .required()
    .messages({
      'any.required': 'Business type is required',
      'any.only': 'Invalid business type',
    }),
  service_types: Joi.when('business_type', {
    is: Joi.exist(),
    then: Joi.custom((value, helpers) => {
      const { business_type } = helpers.state.ancestors[0];
      return createServiceTypesSchema(business_type).validate(value);
    }),
  }),
  licenses: Joi.when('business_type', {
    is: Joi.exist(),
    then: Joi.custom((value, helpers) => {
      const { business_type } = helpers.state.ancestors[0];
      return createLicensesSchema(business_type).validate(value);
    }),
  }),
  business_type_details: businessTypeDetailsSchema,
}).required();

// Schema for preview request
const previewRequestSchema = Joi.object({
  business_type: Joi.string()
    .valid(...Object.values(BUSINESS_TYPES).map((type) => type.code))
    .required()
    .messages({
      'any.required': 'Business type is required for preview',
      'any.only': 'Invalid business type',
    }),
}).required();

// Export validation functions
exports.validateBusinessTypeUpdate = (data) =>
  businessTypeUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

exports.validatePreviewRequest = (data) =>
  previewRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

exports.validatePartialUpdate = (data) =>
  businessTypeUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
