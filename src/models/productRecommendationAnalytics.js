'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductRecommendationAnalytics extends Model {
    static associate(models) {
      // Merchant association
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      // Product association
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'product_id',
        as: 'product'
      });
      
      // Customer association (if applicable)
      if (models.Customer) {
        this.belongsTo(models.Customer, {
          foreignKey: 'customer_id',
          as: 'customer'
        });
      }
    }
  }

  ProductRecommendationAnalytics.init({
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
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'menu_inventories',
        key: 'id'
      }
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    recommendation_type: {
      type: DataTypes.ENUM('trending', 'cross-sell', 'personalized', 'seasonal'),
      allowNull: false
    },
    event_type: {
      type: DataTypes.ENUM('impression', 'click', 'add-to-cart', 'purchase'),
      allowNull: false
    },
    source_product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'menu_inventories',
        key: 'id'
      },
      comment: 'For cross-sell recommendations, the product that led to this recommendation'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Position of the product in the recommendation list'
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Client session ID for tracking user journey'
    },
    device_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context about the recommendation event'
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
    modelName: 'ProductRecommendationAnalytics',
    tableName: 'product_recommendation_analytics',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['recommendation_type']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['session_id']
      }
    ]
  });

  return ProductRecommendationAnalytics;
};