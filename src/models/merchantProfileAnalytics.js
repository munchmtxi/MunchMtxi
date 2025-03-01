// src/models/merchantProfileAnalytics.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantProfileAnalytics extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      this.belongsTo(models.User, {
        foreignKey: 'viewer_id',
        as: 'viewer'
      });
    }
  }

  MerchantProfileAnalytics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id'
      }
    },
    viewer_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null for anonymous views
      references: {
        model: 'users',
        key: 'id'
      }
    },
    source: {
      type: DataTypes.STRING, // e.g., 'search', 'direct', 'referral'
      allowNull: false,
      defaultValue: 'direct'
    },
    device_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    view_duration: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true
    },
    interaction_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    is_unique: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    location_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    view_type: {
      type: DataTypes.ENUM('profile', 'menu', 'reviews', 'photos'),
      defaultValue: 'profile'
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
    }
  }, {
    sequelize,
    modelName: 'MerchantProfileAnalytics',
    tableName: 'merchant_profile_analytics',
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id', 'created_at']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['viewer_id', 'merchant_id', 'created_at']
      }
    ]
  });

  return MerchantProfileAnalytics;
};