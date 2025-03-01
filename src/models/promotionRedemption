'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionRedemption extends Model {
    static associate(models) {
      // Add safety checks to handle potential circular dependencies
      if (models.ProductPromotion) {
        this.belongsTo(models.ProductPromotion, {
          foreignKey: 'promotion_id',
          as: 'promotion'
        });
      }
      
      if (models.Order) {
        this.belongsTo(models.Order, {
          foreignKey: 'order_id',
          as: 'order'
        });
      }
      
      if (models.Customer) {
        this.belongsTo(models.Customer, {
          foreignKey: 'customer_id',
          as: 'customer'
        });
      }
    }
  }

  PromotionRedemption.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'product_promotions',
        key: 'id'
      }
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    promotion_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    redeemed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
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
    modelName: 'PromotionRedemption',
    tableName: 'promotion_redemptions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['promotion_id']
      },
      {
        fields: ['order_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['redeemed_at']
      }
    ]
  });

  return PromotionRedemption;
};