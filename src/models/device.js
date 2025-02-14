'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Device extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }
  
  Device.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Device ID is required' },
      },
    },
    device_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Device type is required' },
      },
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remember_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    os: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    os_version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    browser_version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    screen_resolution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preferred_language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    network_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'wifi, cellular, etc.'
    },
    network_speed: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '4g, 5g, etc.'
    },
    connection_quality: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'excellent, good, fair, poor'
    },
    supports_webp: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    preferred_response_format: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'json'
    },
    max_payload_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum preferred response size in bytes'
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ios, android, or web'
    },
    platform_version: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_pwa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    platform_features: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Platform-specific feature support'
    },
    device_memory: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Available device memory in GB'
    },
    hardware_concurrency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of logical processors'
    },
    supported_apis: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Available Web APIs support'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Device',
    tableName: 'devices',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'device_id'],
        name: 'unique_user_device'
      },
      {
        fields: ['platform'],
        name: 'idx_platform'
      }
    ],
  });
  
  return Device;
};
