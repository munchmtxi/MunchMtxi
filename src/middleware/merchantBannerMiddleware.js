'use strict';
const jwt = require('jsonwebtoken');
const models = require('@models');
const User = models.User;
const Merchant = models.Merchant;
const MerchantBanner = models.MerchantBanner;
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const multer = require('multer');

const bannerUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    logger.info('Checking uploaded file', { originalname: file.originalname, mimetype: file.mimetype });
    if (!supportedFormats.includes(file.mimetype)) {
      logger.error('Unsupported file format detected', { mimetype: file.mimetype });
      return cb(new AppError('Unsupported file format. Use JPEG, PNG, or WEBP', 400));
    }
    cb(null, true);
  },
});

const merchantBannerMiddleware = {
  protectBanner: async (req, res, next) => {
    try {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (!token) {
        return next(new AppError('No token provided', 401));
      }

      logger.info('Verifying JWT', { token });

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        logger.error('JWT verification failed', { error: err.message, secret: !!process.env.JWT_SECRET });
        throw new AppError('Invalid token or authentication failed', 401);
      }

      logger.info('JWT Payload received', { decoded });

      if (!User || !Merchant) {
        throw new Error('User or Merchant model not defined');
      }

      const user = await User.findByPk(decoded.id, {
        include: [{ model: Merchant, as: 'merchant_profile' }],
      });
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      if (user.status !== 'active') {
        return next(new AppError('User account is inactive', 401));
      }
      if (user.role_id !== 19) {
        return next(new AppError('This route is only accessible to merchants', 403));
      }
      if (!user.merchant_profile) {
        return next(new AppError('Merchant profile not found for this user', 404));
      }

      req.user = {
        id: user.id,
        merchantId: user.merchant_profile.id,
        roleId: user.role_id,
      };
      logger.info('Banner route protected', { userId: user.id, merchantId: req.user.merchantId });
      next();
    } catch (error) {
      logger.error('Banner protection failed', { error: error.message });
      return next(new AppError('Invalid token or authentication failed', 401));
    }
  },

  restrictToBannerOwner: async (req, res, next) => {
    try {
      const bannerId = req.params.bannerId;
      if (!bannerId) {
        return next(new AppError('Banner ID not provided', 400));
      }

      const banner = await MerchantBanner.findByPk(bannerId);
      if (!banner) {
        return next(new AppError('Banner not found', 404));
      }
      if (banner.merchant_id !== req.user.merchantId) {
        return next(new AppError('You do not have permission to access this banner', 403));
      }

      req.banner = banner;
      logger.info('Banner ownership verified', { bannerId, merchantId: req.user.merchantId });
      next();
    } catch (error) {
      logger.error('Banner ownership check failed', { error: error.message });
      return next(new AppError('Banner ownership verification failed', 500));
    }
  },

  uploadBannerImage: bannerUpload.single('image'),
};

module.exports = merchantBannerMiddleware;