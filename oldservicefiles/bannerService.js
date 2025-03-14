// src/services/merchantServices/profileServices/bannerService.js
const { MerchantBanner, Merchant } = require('@models');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const { securityAuditLogger } = require('@services/securityAuditLogger');
const imageService = require('./imageService');

// Instead of class, use object with methods
const bannerService = {
  async addBanner(merchantId, userId, bannerData, imageFile) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const bannerUrl = await imageService.uploadBannerImage(
      merchantId,
      imageFile,
      'seasonal'
    );

    const banner = await MerchantBanner.create({
      ...bannerData,
      banner_url: bannerUrl,
      merchant_id: merchantId,
      created_by: userId
    });

    await securityAuditLogger.logSecurityAudit('MERCHANT_BANNER_ADDED', {
      userId,
      merchantId,
      severity: 'info',
      metadata: {
        bannerId: banner.id,
        season: {
          start: banner.season_start,
          end: banner.season_end
        }
      }
    });

    return banner;
  },

  async updateBanner(merchantId, bannerId, userId, updateData, imageFile) {
    const banner = await this.getBanner(merchantId, bannerId);

    if (imageFile) {
      await imageService.deleteBannerImage(banner.banner_url);
      updateData.banner_url = await imageService.uploadBannerImage(
        merchantId,
        imageFile,
        'seasonal'
      );
    }

    await banner.update(updateData);
    return banner;
  },

  async deleteBanner(merchantId, bannerId, userId) {
    const banner = await this.getBanner(merchantId, bannerId);
    await imageService.deleteBannerImage(banner.banner_url);
    await banner.destroy();
  },

  async getBanner(merchantId, bannerId) {
    const banner = await MerchantBanner.findOne({
      where: {
        id: bannerId,
        merchant_id: merchantId
      }
    });

    if (!banner) {
      throw new AppError('Banner not found', 404, 'BANNER_NOT_FOUND');
    }

    return banner;
  },

  async getActiveBanners(merchantId) {
    const now = new Date();
    return MerchantBanner.findAll({
      where: {
        merchant_id: merchantId,
        is_active: true,
        season_start: { [Op.lte]: now },
        season_end: { [Op.gte]: now }
      },
      order: [
        ['display_order', 'ASC'],
        ['created_at', 'DESC']
      ]
    });
  },

  async updateBannerOrder(merchantId, bannerOrders) {
    await Promise.all(
      bannerOrders.map(({ id, order }) =>
        MerchantBanner.update(
          { display_order: order },
          { where: { id, merchant_id: merchantId } }
        )
      )
    );
  }
};

module.exports = bannerService;