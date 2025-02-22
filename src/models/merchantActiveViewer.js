// src/models/merchantActiveViewer.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantActiveViewer extends Model {
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

  MerchantActiveViewer.init({
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
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    socket_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    last_activity: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    viewer_type: {
      type: DataTypes.ENUM('guest', 'customer', 'merchant', 'staff'),
      defaultValue: 'guest'
    },
    viewer_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'idle', 'disconnected'),
      defaultValue: 'active'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      onUpdate: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'MerchantActiveViewer',
    tableName: 'merchant_active_viewers',
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id', 'status']
      },
      {
        fields: ['socket_id']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['last_activity']
      }
    ]
  });

  // Static method to cleanup inactive viewers
  MerchantActiveViewer.cleanup = async function(timeoutMinutes = 5) {
    const cutoff = new Date(Date.now() - (timeoutMinutes * 60 * 1000));
    return this.destroy({
      where: {
        last_activity: {
          [sequelize.Op.lt]: cutoff
        }
      }
    });
  };

  // Instance method to update activity
  MerchantActiveViewer.prototype.updateActivity = async function() {
    this.last_activity = new Date();
    this.status = 'active';
    return this.save();
  };

  return MerchantActiveViewer;
};