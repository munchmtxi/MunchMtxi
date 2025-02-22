// @models/merchant2FA.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Merchant2FA extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      this.hasMany(models.Merchant2FABackupCode, {
        foreignKey: 'merchant_2fa_id',
        as: 'backupCodes'
      });
    }
  }

  Merchant2FA.init({
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
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    preferred_method: {
      type: DataTypes.ENUM('authenticator', 'sms', 'email', 'biometric'),
      allowNull: false,
      defaultValue: 'authenticator'
    },
    secret_key: {
      type: DataTypes.STRING,
      allowNull: true
    },
    backup_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    backup_phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_verified: {
      type: DataTypes.DATE,
      allowNull: true
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
    modelName: 'Merchant2FA',
    tableName: 'merchant_2fa',
    underscored: true,
    timestamps: true
  });

  return Merchant2FA;
};

