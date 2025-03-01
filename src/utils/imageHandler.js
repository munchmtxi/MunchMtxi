/**
 * Module for handling image uploads, processing, and deletion.
 *
 * This module uses Sharp for image manipulation and the fs.promises API
 * for file system operations. It validates image files against supported
 * formats and file size limits before processing and saving them.
 *
 * @module utils/imageHandler
 */
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class ImageHandler {
  /**
   * Creates an instance of ImageHandler.
   *
   * Sets the upload path where merchant images will be stored.
   */
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'uploads', 'merchants');
  }

  /**
   * Initializes the upload directory by creating it if it doesn't exist.
   *
   * @async
   * @throws {AppError} Throws an error if the upload directory cannot be created.
   */
  async init() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
      throw new AppError('Upload directory setup failed', 500);
    }
  }

  /**
   * Validates the provided image file.
   *
   * Checks if the file exists, is of a supported format, and does not exceed
   * the maximum allowed file size.
   *
   * @param {Object} file - The image file object.
   * @param {string} file.mimetype - The MIME type of the file.
   * @param {number} file.size - The size of the file in bytes.
   * @throws {AppError} Throws an error if no file is provided, the format is unsupported,
   * or the file size exceeds the allowed limit.
   */
  validateImage(file) {
    if (!file) throw new AppError('No file provided', 400);
    if (!SUPPORTED_FORMATS.includes(file.mimetype)) {
      throw new AppError('Unsupported file format', 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('File size exceeds limit', 400);
    }
  }

  /**
   * Processes the image using Sharp and saves it to the upload directory.
   *
   * The image is validated, resized based on its type, converted to WebP format,
   * and saved with a unique filename.
   *
   * - For a 'logo' type, the image is resized to 200x200 pixels.
   * - For other types, the image is resized to 1200x400 pixels.
   *
   * @async
   * @param {Object} file - The image file object containing a buffer, mimetype, and size.
   * @param {string|number} merchantId - The identifier for the merchant.
   * @param {string} type - The type of the image (e.g., 'logo').
   * @returns {Promise<string>} The filename of the processed and saved image.
   * @throws {AppError} Throws an error if image processing fails.
   */
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

  /**
   * Deletes the specified image file from the upload directory.
   *
   * @async
   * @param {string} filename - The name of the file to be deleted.
   * @returns {Promise<void>}
   * @throws {AppError} Throws an error if the file cannot be deleted.
   */
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

// Export a single instance of ImageHandler
module.exports = new ImageHandler();
