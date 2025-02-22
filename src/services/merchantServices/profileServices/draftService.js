// src/models/merchantDraft.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantDraft extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      this.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'editor'
      });
    }
  }

  MerchantDraft.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    draft_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidDraftData(value) {
          // Ensure draft_data contains valid merchant fields
          const allowedFields = [
            'business_name', 'address', 'phone_number', 'currency',
            'time_zone', 'business_hours', 'notification_preferences',
            'whatsapp_enabled', 'service_radius', 'location'
          ];
          
          const invalidFields = Object.keys(value)
            .filter(key => !allowedFields.includes(key));
            
          if (invalidFields.length > 0) {
            throw new Error(`Invalid fields in draft: ${invalidFields.join(', ')}`);
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending_review', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'draft'
    },
    review_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MerchantDraft',
    tableName: 'merchant_drafts',
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id', 'status'],
        name: 'merchant_drafts_merchant_status'
      }
    ]
  });

  return MerchantDraft;
};

// src/services/merchantServices/profileServices/draftService.js
const { MerchantDraft, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');
const securityAuditLogger = require('@services/securityAuditLogger');
const roomService = require('@services/roomService');
const TokenService = require('@services/tokenService');

class MerchantDraftService {
  async createOrUpdateDraft(merchantId, userId, draftData, authToken) {
    // Verify token is still valid
    const isBlacklisted = await TokenService.isTokenBlacklisted(merchantId);
    if (isBlacklisted) {
      throw new AppError('Session expired', 401, 'TOKEN_BLACKLISTED');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Find existing draft or create new one
    const [draft, created] = await MerchantDraft.findOrCreate({
      where: { 
        merchant_id: merchantId,
        status: 'draft'
      },
      defaults: {
        draft_data: draftData,
        updated_by: userId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    if (!created) {
      draft.draft_data = { ...draft.draft_data, ...draftData };
      draft.updated_by = userId;
      draft.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await draft.save();
    }

    // Log the draft update
    await securityAuditLogger.logSecurityAudit('MERCHANT_DRAFT_UPDATE', {
      userId,
      merchantId,
      severity: 'info',
      metadata: {
        draftId: draft.id,
        changes: draftData
      },
      compliance: {
        category: 'data_modification_draft',
        violations: null
      }
    });

    return draft;
  }

  async getDraft(merchantId) {
    const draft = await MerchantDraft.findOne({
      where: {
        merchant_id: merchantId,
        status: 'draft',
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!draft) {
      return null;
    }

    return draft;
  }

  async submitDraft(merchantId, userId) {
    const draft = await this.getDraft(merchantId);
    if (!draft) {
      throw new AppError('No active draft found', 404, 'DRAFT_NOT_FOUND');
    }

    draft.status = 'pending_review';
    await draft.save();

    // Log the submission
    await securityAuditLogger.logSecurityAudit('MERCHANT_DRAFT_SUBMIT', {
      userId,
      merchantId,
      severity: 'info',
      metadata: {
        draftId: draft.id
      }
    });

    return draft;
  }
}

module.exports = new MerchantDraftService();