const Joi = require('joi');

const bannerSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .label('Banner Title'),
  season_start: Joi.date()
    .iso()
    .required()
    .label('Season Start Date'),
  season_end: Joi.date()
    .iso()
    .min(Joi.ref('season_start'))
    .required()
    .label('Season End Date'),
  is_active: Joi.boolean()
    .default(true)
    .label('Active Status'),
  display_order: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .label('Display Order'),
  metadata: Joi.object({
    altText: Joi.string().trim().max(200),
    linkUrl: Joi.string().uri(),
    campaign: Joi.string().trim().max(100)
  }).label('Metadata')
}).label('Banner').options({ stripUnknown: true });

const bannerOrderSchema = Joi.array().items(
  Joi.object({
    id: Joi.number().integer().required(),
    order: Joi.number().integer().min(0).required()
  })
).unique('order').label('Banner Order');

exports.validateBanner = (data) => bannerSchema.validate(data);
exports.validateBannerOrder = (data) => bannerOrderSchema.validate(data);