// @middleware/uploadMiddleware.js
const multer = require('multer');
const AppError = require('@utils/AppError');

// Configure multer storage
const storage = multer.memoryStorage();

// Configure file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Export upload middleware functions
exports.uploadImage = upload.single('image');

exports.uploadBanner = upload.single('banner');

exports.uploadMultiple = upload.array('images', 10);

exports.uploadFields = upload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

// Error handler middleware
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};

// Export the multer instance itself for custom configurations
exports.upload = upload;