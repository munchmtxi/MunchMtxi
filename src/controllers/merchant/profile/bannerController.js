'use strict';
const bannerService = require('@services/merchant/profile/bannerService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const bannerController = {
  addBanner: async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('No image file provided', 400));
      }
      const banner = await bannerService.addBanner(
        req.user.merchantId,
        req.user.id,
        req.body,
        req.file
      );
      res.status(201).json({ status: 'success', data: banner });
    } catch (error) {
      next(error);
    }
  },

  updateBanner: async (req, res, next) => {
    try {
      const banner = await bannerService.updateBanner(
        req.user.merchantId,
        req.params.bannerId,
        req.user.id,
        req.body,
        req.file // Optional: only if updating the image
      );
      res.status(200).json({ status: 'success', data: banner });
    } catch (error) {
      next(error);
    }
  },

  deleteBanner: async (req, res, next) => {
    try {
      await bannerService.deleteBanner(req.user.merchantId, req.params.bannerId, req.user.id);
      res.status(204).json({ status: 'success', data: null });
    } catch (error) {
      next(error);
    }
  },

  getBanner: async (req, res, next) => {
    try {
      const banner = req.banner; // Set by restrictToBannerOwner
      res.status(200).json({ status: 'success', data: banner });
    } catch (error) {
      next(error);
    }
  },

  getActiveBanners: async (req, res, next) => {
    try {
      const banners = await bannerService.getActiveBanners(req.user.merchantId);
      res.status(200).json({ status: 'success', data: banners });
    } catch (error) {
      next(error);
    }
  },

  updateBannerOrder: async (req, res, next) => {
    try {
      await bannerService.updateBannerOrder(req.user.merchantId, req.body.bannerOrders);
      res.status(200).json({ status: 'success', message: 'Banner order updated' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = bannerController;