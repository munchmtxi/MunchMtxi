// src/models/merchantActivityLog.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantActivityLog extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      this.belongsTo(models.User, {
        foreignKey: 'actor_id',
        as: 'actor'
      });
      this.belongsTo(models.Device, {
        foreignKey: 'device_id',
        as: 'device'
      });
    }
  }

  MerchantActivityLog.init({
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
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devices',
        key: 'id'
      }
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    security_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    previous_hash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'MerchantActivityLog',
    tableName: 'merchant_activity_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['merchant_id', 'created_at'],
        name: 'idx_merchant_activity_time'
      },
      {
        fields: ['actor_id'],
        name: 'idx_merchant_activity_actor'
      },
      {
        fields: ['event_type'],
        name: 'idx_merchant_activity_event'
      }
    ]
  });

  return MerchantActivityLog;
};