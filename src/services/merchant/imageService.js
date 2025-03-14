// src/services/merchant/imageService.js
'use strict';
const models = require('@models'); // Direct import, assuming src/models/index.js exports db
const path = require('path');
const sharp = require('sharp');
const { logger } = require('@utils/logger'); // Optional: for debugging

const uploadImage = async (merchantId, file, imageType) => {
  logger.debug('Uploading image for merchant', { merchantId, imageType });
  const merchant = await models.Merchant.findByPk(merchantId);
  if (!merchant) throw new Error('Merchant not found');

  const fileName = `${merchantId}-${imageType}-${Date.now()}.webp`;
  const filePath = path.join(__dirname, '../../../uploads/merchants', fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);

  const imageUrl = `/uploads/merchants/${fileName}`;
  await merchant.update({ [`${imageType}_url`]: imageUrl });

  logger.debug('Image uploaded successfully', { merchantId, imageUrl });
  return { success: true, data: { [`${imageType}Url`]: imageUrl } };
};

const deleteImage = async (merchantId, imageType) => {
  const merchant = await models.Merchant.findByPk(merchantId);
  if (!merchant) throw new Error('Merchant not found');

  await merchant.update({ [`${imageType}_url`]: null });
  return { success: true, message: `${imageType} deleted successfully` };
};

module.exports = { uploadImage, deleteImage };