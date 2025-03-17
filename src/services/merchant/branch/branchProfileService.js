// src/services/merchant/branch/branchProfileService.js
'use strict';
const { MerchantBranch, Merchant } = require('@models');
const mapsService = require('@services/merchant/profile/mapsService');
const { uploadImage, deleteImage, uploadBannerImage, deleteBannerImage } = require('@services/merchant/profile/mapsService'); // Assuming this is where image utils live
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const branchProfileService = {
  /**
   * Create a new branch profile for a merchant.
   * @param {number} merchantId - The ID of the merchant.
   * @param {object} branchData - Data for the new branch (name, location, etc.).
   * @param {object} files - Uploaded files (logo, banner).
   * @returns {object} - Created branch profile.
   */
  createBranchProfile: async (merchantId, branchData) => {
    try {
      const { placeId, sessionToken, location, ...rest } = branchData;
      let placeDetails;
      if (placeId && sessionToken) {
        placeDetails = await mapsService.getPlaceDetails({ placeId, sessionToken });
      }
  
      // Convert location to GeoJSON if provided as latitude/longitude
      const geoLocation = location && location.latitude && location.longitude
        ? { type: 'Point', coordinates: [location.longitude, location.latitude] }
        : (placeDetails ? { type: 'Point', coordinates: [placeDetails.geometry.location.lng, placeDetails.geometry.location.lat] } : null);
  
      const branch = await MerchantBranch.create({
        merchant_id: merchantId,
        name: rest.name,
        branch_code: rest.branch_code,
        contact_email: rest.contact_email,
        contact_phone: rest.contact_phone,
        address: rest.address || placeDetails?.formatted_address,
        location: geoLocation,
        operating_hours: rest.operating_hours,
        delivery_radius: rest.delivery_radius,
        is_active: true,
      });
  
      return branch;
    } catch (error) {
      logger.error('Error creating branch profile', { merchantId, error: error.message, stack: error.stack });
      throw new Error('Failed to create branch profile');
    }
  },

  /**
   * Retrieve a branch profile by ID.
   * @param {number} branchId - The ID of the branch.
   * @returns {object} - Branch profile data.
   */
  async getBranchProfile(branchId) {
    try {
      const branch = await MerchantBranch.findByPk(branchId, {
        include: [{ model: Merchant, as: 'merchant' }],
      });
      if (!branch) {
        logger.warn('Branch not found', { branchId });
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      logger.info('Branch profile retrieved', { branchId });
      return branch.toJSON();
    } catch (error) {
      logger.error('Error retrieving branch profile', { branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve branch profile', 500, 'BRANCH_RETRIEVAL_FAILURE');
    }
  },

  /**
   * Update an existing branch profile.
   * @param {number} branchId - The ID of the branch.
   * @param {object} branchData - Updated branch data.
   * @param {object} files - Uploaded files (logo, banner).
   * @returns {object} - Updated branch profile.
   */
  async updateBranchProfile(branchId, branchData, files = {}) {
    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        logger.warn('Branch not found for update', { branchId });
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      const { name, placeId, location, operating_hours, delivery_radius, status } = branchData;

      // Fetch address details if placeId changes
      let formattedAddress, geoLocation;
      if (placeId && placeId !== branch.place_id) {
        const placeDetails = await mapsService.getPlaceDetails(placeId, branchData.sessionToken);
        formattedAddress = placeDetails.formattedAddress;
        geoLocation = placeDetails.location;
      } else if (location) {
        geoLocation = { lat: location.latitude, lng: location.longitude };
      }

      // Update branch details
      await branch.update({
        name: name || branch.name,
        place_id: placeId || branch.place_id,
        formatted_address: formattedAddress || branch.formatted_address,
        latitude: geoLocation?.lat || branch.latitude,
        longitude: geoLocation?.lng || branch.longitude,
        operating_hours: operating_hours || branch.operating_hours,
        delivery_radius: delivery_radius !== undefined ? delivery_radius : branch.delivery_radius,
        status: status || branch.status,
      });

      // Handle image updates
      const imageResults = {};
      if (files.logo) {
        if (branch.logo_url) await deleteImage(branch.merchant_id, 'logo');
        const logoResult = await uploadImage(branch.merchant_id, files.logo, 'logo');
        await branch.update({ logo_url: logoResult.data.logoUrl });
        imageResults.logoUrl = logoResult.data.logoUrl;
      }
      if (files.banner) {
        if (branch.banner_url) await deleteBannerImage(branch.banner_url);
        const bannerUrl = await uploadBannerImage(branch.merchant_id, files.banner, 'banner');
        await branch.update({ banner_url: bannerUrl });
        imageResults.bannerUrl = bannerUrl;
      }

      logger.info('Branch profile updated', { branchId, merchantId: branch.merchant_id });
      return { ...branch.toJSON(), ...imageResults };
    } catch (error) {
      logger.error('Error updating branch profile', { branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Failed to update branch profile', 500, 'BRANCH_UPDATE_FAILURE');
    }
  },

  /**
   * Delete a branch profile.
   * @param {number} branchId - The ID of the branch.
   * @returns {object} - Deletion confirmation.
   */
  async deleteBranchProfile(branchId) {
    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        logger.warn('Branch not found for deletion', { branchId });
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      // Clean up images if they exist
      if (branch.logo_url) await deleteImage(branch.merchant_id, 'logo');
      if (branch.banner_url) await deleteBannerImage(branch.banner_url);

      await branch.destroy();
      logger.info('Branch profile deleted', { branchId, merchantId: branch.merchant_id });
      return { success: true, message: 'Branch profile deleted successfully' };
    } catch (error) {
      logger.error('Error deleting branch profile', { branchId, error: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Failed to delete branch profile', 500, 'BRANCH_DELETION_FAILURE');
    }
  },

  /**
   * Get address predictions for branch creation/update.
   * @param {string} input - Search input for address.
   * @param {string} sessionToken - Google Maps session token.
   * @returns {array} - List of address predictions.
   */
  async getAddressPredictions(input, sessionToken) {
    try {
      const predictions = await mapsService.getPlacePredictions(input, sessionToken);
      logger.info('Address predictions fetched', { input, count: predictions.length });
      return predictions;
    } catch (error) {
      logger.error('Error fetching address predictions', { input, error: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Failed to fetch address predictions', 500, 'ADDRESS_PREDICTION_FAILURE');
    }
  },

  /**
   * List all branches for a merchant.
   * @param {number} merchantId - The ID of the merchant.
   * @returns {array} - List of branch profiles.
   */
  async listBranchProfiles(merchantId) {
    try {
      const branches = await MerchantBranch.findAll({
        where: { merchant_id: merchantId },
      });
      logger.info('Branch profiles listed', { merchantId, count: branches.length });
      return branches.map(branch => branch.toJSON());
    } catch (error) {
      logger.error('Error listing branch profiles', { merchantId, error: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Failed to list branch profiles', 500, 'BRANCH_LISTING_FAILURE');
    }
  },
};

module.exports = branchProfileService;