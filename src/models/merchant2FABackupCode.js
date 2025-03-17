// @models/merchant2FABackupCode.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Merchant2FABackupCode extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant2FA, {
        foreignKey: 'merchant_2fa_id',
        as: 'merchant2fa'
      });
    }
  }

  Merchant2FABackupCode.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_2fa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_2fa',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'Merchant2FABackupCode',
    tableName: 'merchant_2fa_backup_codes',
    underscored: true,
    timestamps: true,
    updatedAt: false
  });

  return Merchant2FABackupCode;
};