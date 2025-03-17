// src/controllers/merchant/branch/branchProfileController.js
'use strict';
const branchProfileService = require('@services/merchant/branch/branchProfileService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const branchProfileController = {
  /**
   * Create a new branch profile.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async createBranchProfile(req, res, next) {
    try {
      const { merchantId } = req.user; // From authenticateBranchMerchant middleware
      const branchData = req.body;
      const files = req.files || {};

      logger.debug('Creating branch profile', { merchantId, branchData });

      const branch = await branchProfileService.createBranchProfile(merchantId, branchData, files);
      res.status(201).json({
        status: 'success',
        data: branch,
      });
    } catch (error) {
      logger.error('Error in createBranchProfile controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Retrieve a branch profile by ID.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async getBranchProfile(req, res, next) {
    try {
      const { branchId } = req.params;

      logger.debug('Retrieving branch profile', { branchId });

      const branch = await branchProfileService.getBranchProfile(branchId);
      res.status(200).json({
        status: 'success',
        data: branch,
      });
    } catch (error) {
      logger.error('Error in getBranchProfile controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Update an existing branch profile.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async updateBranchProfile(req, res, next) {
    try {
      const { branchId } = req.params;
      const branchData = req.body;
      const files = req.files || {};

      logger.debug('Updating branch profile', { branchId, branchData });

      const updatedBranch = await branchProfileService.updateBranchProfile(branchId, branchData, files);
      res.status(200).json({
        status: 'success',
        data: updatedBranch,
      });
    } catch (error) {
      logger.error('Error in updateBranchProfile controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Delete a branch profile.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async deleteBranchProfile(req, res, next) {
    try {
      const { branchId } = req.params;

      logger.debug('Deleting branch profile', { branchId });

      const result = await branchProfileService.deleteBranchProfile(branchId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error in deleteBranchProfile controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * Get address predictions for branch location input.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async getAddressPredictions(req, res, next) {
    try {
      const { input, sessionToken } = req.query;

      logger.debug('Fetching address predictions', { input });

      const predictions = await branchProfileService.getAddressPredictions(input, sessionToken);
      res.status(200).json({
        status: 'success',
        data: predictions,
      });
    } catch (error) {
      logger.error('Error in getAddressPredictions controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  /**
   * List all branch profiles for the authenticated merchant.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {function} next - Express next middleware function.
   */
  async listBranchProfiles(req, res, next) {
    try {
      const { merchantId } = req.user;

      logger.debug('Listing branch profiles', { merchantId });

      const branches = await branchProfileService.listBranchProfiles(merchantId);
      res.status(200).json({
        status: 'success',
        data: branches,
      });
    } catch (error) {
      logger.error('Error in listBranchProfiles controller', { error: error.message, stack: error.stack });
      next(error);
    }
  },
};

module.exports = branchProfileController;