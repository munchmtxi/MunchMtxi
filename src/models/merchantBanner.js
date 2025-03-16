'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantBanner extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
      });
    }
  }

  MerchantBanner.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
      },
      banner_url: {
        type: DataTypes.STRING,
        allowNull: false,
        // Removed isUrl validation to allow relative paths
        // validate: {
        //   isUrl: true
        // }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      season_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      season_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MerchantBanner',
      tableName: 'merchant_banners',
      underscored: true,
      timestamps: true,
      hooks: {
        beforeCreate: async (banner) => {
          if (banner.season_start > banner.season_end) {
            throw new Error('Season start date must be before end date');
          }
        },
      },
    }
  );

  return MerchantBanner;
};