// src/config/multerConfig.js
'use strict';
const multer = require('multer');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (!allowedTypes.includes(file.mimetype)) {
    logger.warn('Invalid file type uploaded', { mimetype: file.mimetype });
    return cb(new AppError('Only CSV or XLSX files are allowed', 400), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;