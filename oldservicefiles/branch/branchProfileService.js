// src/services/merchantServices/branchProfileServices/branchProfileService.js

const { MerchantBranch, BranchMetrics, BranchActivity, Geofence } = require('@models');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const eventManager = require('@services/eventManager');
const imageService = require('@services/merchantServices/profileServices/imageService');
const mapsService = require('@services/merchantServices/profileServices/mapsService');
const { sequelize } = require('@models');

class BranchProfileService {
  constructor() {
    this.imageService = imageService;
    this.mapsService = mapsService;
  }

  /**
   * Create a new branch profile
   * @param {number} merchantId - The merchant ID
   * @param {Object} branchData - The branch profile data
   * @returns {Promise<Object>} Created branch profile
   */
  async createBranchProfile(merchantId, branchData) {
    const transaction = await sequelize.transaction();

    try {
      // Generate unique branch code
      const branchCode = await this.generateBranchCode(merchantId);
      
      // Process location data
      const locationPoint = await this.mapsService.validateAndFormatLocation(
        branchData.location.latitude,
        branchData.location.longitude
      );

      // Create geofence if delivery radius is provided
      let geofence = null;
      if (branchData.delivery_radius) {
        geofence = await Geofence.create({
          center: locationPoint,
          radius: branchData.delivery_radius,
          type: 'branch_delivery'
        }, { transaction });
      }

      // Create branch profile
      const branch = await MerchantBranch.create({
        ...branchData,
        merchant_id: merchantId,
        branch_code: branchCode,
        location: locationPoint,
        geofence_id: geofence?.id,
      }, { transaction });

      // Initialize branch metrics
      await BranchMetrics.create({
        branch_id: branch.id,
        metric_date: new Date(),
      }, { transaction });

      await transaction.commit();

      // Emit event for branch creation
      eventManager.emit('branch.created', {
        merchantId,
        branchId: branch.id,
        branch: branch.toJSON()
      });

      return branch;
    } catch (error) {
      await transaction.rollback();
      throw new AppError(`Failed to create branch profile: ${error.message}`, 400);
    }
  }

  /**
   * Update branch profile
   * @param {number} branchId - The branch ID
   * @param {Object} updateData - The update data
   * @param {number} userId - The user making the update
   * @returns {Promise<Object>} Updated branch profile
   */
  async updateBranchProfile(branchId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        throw new AppError('Branch not found', 404);
      }

      // Track changes for activity log
      const changes = {};

      // Handle location update
      if (updateData.location) {
        const newLocation = await this.mapsService.validateAndFormatLocation(
          updateData.location.latitude,
          updateData.location.longitude
        );
        
        // Update geofence if delivery radius changed
        if (updateData.delivery_radius && updateData.delivery_radius !== branch.delivery_radius) {
          const geofence = await Geofence.findByPk(branch.geofence_id);
          if (geofence) {
            await geofence.update({
              center: newLocation,
              radius: updateData.delivery_radius
            }, { transaction });
          } else {
            const newGeofence = await Geofence.create({
              center: newLocation,
              radius: updateData.delivery_radius,
              type: 'branch_delivery'
            }, { transaction });
            updateData.geofence_id = newGeofence.id;
          }
        }
        
        updateData.location = newLocation;
        changes.location = {
          previous: branch.location,
          new: newLocation
        };
      }

      // Handle media updates
      if (updateData.media) {
        const processedMedia = await this.imageService.processAndUploadMedia(
          updateData.media,
          branch.id,
          'branch'
        );
        updateData.media = {
          ...branch.media,
          ...processedMedia
        };
        changes.media = {
          previous: branch.media,
          new: updateData.media
        };
      }

      // Update operating hours
      if (updateData.operating_hours) {
        changes.operating_hours = {
          previous: branch.operating_hours,
          new: updateData.operating_hours
        };
      }

      // Update branch profile
      await branch.update(updateData, { transaction });

      // Log activity
      await BranchActivity.create({
        branch_id: branchId,
        user_id: userId,
        activity_type: 'profile_update',
        description: 'Updated branch profile',
        changes
      }, { transaction });

      await transaction.commit();

      // Emit event for profile update
      eventManager.emit('branch.profile.updated', {
        merchantId: branch.merchant_id,
        branchId,
        changes
      });

      return branch;
    } catch (error) {
      await transaction.rollback();
      throw new AppError(`Failed to update branch profile: ${error.message}`, 400);
    }
  }

  /**
   * Get branch profile with metrics
   * @param {number} branchId - The branch ID
   * @returns {Promise<Object>} Branch profile with metrics
   */
  async getBranchProfile(branchId) {
    const branch = await MerchantBranch.findByPk(branchId, {
      include: [
        {
          model: BranchMetrics,
          as: 'metrics',
          where: {
            metric_date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        {
          model: Geofence,
          as: 'geofence'
        }
      ]
    });

    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    return branch;
  }

  /**
   * Delete branch profile
   * @param {number} branchId - The branch ID
   * @param {number} userId - The user making the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteBranchProfile(branchId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        throw new AppError('Branch not found', 404);
      }

      // Log deletion activity
      await BranchActivity.create({
        branch_id: branchId,
        user_id: userId,
        activity_type: 'profile_update',
        description: 'Deleted branch profile'
      }, { transaction });

      // Soft delete the branch
      await branch.destroy({ transaction });

      await transaction.commit();

      // Emit event for branch deletion
      eventManager.emit('branch.deleted', {
        merchantId: branch.merchant_id,
        branchId
      });

      return true;
    } catch (error) {
      await transaction.rollback();
      throw new AppError(`Failed to delete branch profile: ${error.message}`, 400);
    }
  }

  /**
   * Generate unique branch code
   * @param {number} merchantId - The merchant ID
   * @returns {Promise<string>} Unique branch code
   */
  async generateBranchCode(merchantId) {
    const prefix = 'BR';
    const timestamp = Date.now().toString().slice(-6);
    const merchantPrefix = merchantId.toString().padStart(4, '0');
    const branchCode = `${prefix}${merchantPrefix}${timestamp}`;
    
    // Verify uniqueness
    const existing = await MerchantBranch.findOne({
      where: { branch_code: branchCode }
    });

    if (existing) {
      // If code exists, recursively try again
      return this.generateBranchCode(merchantId);
    }

    return branchCode;
  }

  /**
   * Get branch activity log
   * @param {number} branchId - The branch ID
   * @param {Object} options - Query options (pagination, filters)
   * @returns {Promise<Object>} Activity log entries
   */
  async getBranchActivity(branchId, options = {}) {
    const { page = 1, limit = 10, type } = options;

    const query = {
      where: { branch_id: branchId },
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    };

    if (type) {
      query.where.activity_type = type;
    }

    const activities = await BranchActivity.findAndCountAll(query);

    return {
      activities: activities.rows,
      total: activities.count,
      page,
      totalPages: Math.ceil(activities.count / limit)
    };
  }
}

module.exports = new BranchProfileService();
