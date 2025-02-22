// @utils/imageHandler.js
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class ImageHandler {
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'uploads', 'merchants');
  }

  async init() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
      throw new AppError('Upload directory setup failed', 500);
    }
  }

  validateImage(file) {
    if (!file) throw new AppError('No file provided', 400);
    if (!SUPPORTED_FORMATS.includes(file.mimetype)) {
      throw new AppError('Unsupported file format', 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('File size exceeds limit', 400);
    }
  }

  async processAndSave(file, merchantId, type) {
    this.validateImage(file);
    
    const filename = `${merchantId}-${type}-${Date.now()}.webp`;
    const filepath = path.join(this.uploadPath, filename);

    try {
      await sharp(file.buffer)
        .resize(type === 'logo' ? 200 : 1200, type === 'logo' ? 200 : 400)
        .webp({ quality: 80 })
        .toFile(filepath);

      return filename;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw new AppError('Failed to process image', 500);
    }
  }

  async deleteImage(filename) {
    try {
      const filepath = path.join(this.uploadPath, filename);
      await fs.unlink(filepath);
    } catch (error) {
      logger.error('Failed to delete image:', error);
      throw new AppError('Failed to delete image', 500);
    }
  }
}

// Fix the module.exports syntax
module.exports = new ImageHandler();