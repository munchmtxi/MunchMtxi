// src/validators/merchantValidators/profileValidators/activityValidator.js
const Joi = require('joi');

const activityQuerySchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .max('now')
    .label('Start Date'),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .max('now')
    .label('End Date'),

  eventTypes: Joi.array()
    .items(Joi.string().valid(
      'PROFILE_UPDATE',
      'LOCATION_UPDATE',
      'HOURS_UPDATE',
      'SETTINGS_UPDATE',
      'IMAGE_UPDATE'
    ))
    .unique()
    .label('Event Types'),

  actorId: Joi.number()
    .integer()
    .positive()
    .label('Actor ID'),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .label('Limit'),

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .label('Offset'),

  sortBy: Joi.string()
    .valid('created_at', 'event_type', 'actor_id')
    .default('created_at')
    .label('Sort By'),

  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .label('Order')
}).label('Activity Query');

exports.validateActivityQuery = (data) => activityQuerySchema.validate(data, {
  abortEarly: false,
  stripUnknown: true
});