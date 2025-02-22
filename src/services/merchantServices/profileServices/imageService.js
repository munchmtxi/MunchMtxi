// @services/merchantServices/profileServices/imageService.js
const { models } = require('@models');
const AppError = require('@utils/AppError');
const imageHandler = require('@utils/imageHandler');
const logger = require('@utils/logger');

class MerchantImageService {
  async uploadImage(merchantId, file, imageType) {
    const merchant = await models.Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    try {
      // Delete old image if exists
      const oldImage = merchant[`${imageType}Url`];
      if (oldImage) {
        await imageHandler.deleteImage(oldImage);
      }

      // Process and save new image
      const filename = await imageHandler.processAndSave(file, merchantId, imageType);
      
      // Update merchant record
      await merchant.update({
        [`${imageType}Url`]: filename
      });

      return {
        success: true,
        data: {
          [`${imageType}Url`]: filename
        }
      };
    } catch (error) {
      logger.error(`Failed to upload ${imageType}:`, error);
      throw new AppError(`Failed to upload ${imageType}`, 500);
    }
  }

  async deleteImage(merchantId, imageType) {
    const merchant = await models.Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    const currentImage = merchant[`${imageType}Url`];
    if (!currentImage) {
      throw new AppError(`No ${imageType} image found`, 404);
    }

    try {
      await imageHandler.deleteImage(currentImage);
      await merchant.update({
        [`${imageType}Url`]: null
      });

      return {
        success: true,
        message: `${imageType} deleted successfully`
      };
    } catch (error) {
      logger.error(`Failed to delete ${imageType}:`, error);
      throw new AppError(`Failed to delete ${imageType}`, 500);
    }
  }
}

module.exports = new MerchantImageService();
