'use strict';
const models = require('@models');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises; // Added for file deletion
const { logger } = require('@utils/logger');

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

const uploadBannerImage = async (merchantId, file, imageType) => {
  logger.debug('Uploading banner image for merchant', { merchantId, imageType });
  const merchant = await models.Merchant.findByPk(merchantId);
  if (!merchant) throw new Error('Merchant not found');

  const fileName = `${merchantId}-${imageType}-${Date.now()}.webp`;
  const filePath = path.join(__dirname, '../../../uploads/merchants', fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);

  const imageUrl = `/uploads/merchants/${fileName}`;
  logger.debug('Banner image uploaded successfully', { merchantId, imageUrl });
  return imageUrl; // Return URL directly for bannerService
};

const deleteBannerImage = async (bannerUrl) => {
  logger.debug('Deleting banner image', { bannerUrl });
  if (!bannerUrl) {
    logger.warn('No banner URL provided for deletion');
    return { success: true, message: 'No image to delete' };
  }

  const filePath = path.join(__dirname, '../../../', bannerUrl);
  try {
    await fs.unlink(filePath);
    logger.debug('Banner image deleted from filesystem', { bannerUrl });
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('Banner image file not found for deletion', { bannerUrl });
    } else {
      throw error; // Re-throw unexpected errors
    }
  }
  return { success: true, message: 'Banner image deleted successfully' };
};

module.exports = { uploadImage, deleteImage, uploadBannerImage, deleteBannerImage };