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