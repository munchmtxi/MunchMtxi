'use strict';
const { Model, Op } = require('sequelize'); // Import Sequelize and Op

module.exports = (sequelize, DataTypes) => {
  class ProductPromotion extends Model {
    static associate(models) {
      // Merchant relationship
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      // Creator relationship
      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      
      // Products relationship (many-to-many)
      this.belongsToMany(models.MenuInventory, {
        through: 'promotion_menu_items',
        foreignKey: 'promotion_id',
        otherKey: 'menu_item_id',
        as: 'promotionItems'
      });
      
      // Promotion redemptions
      this.hasMany(models.PromotionRedemption, {
        foreignKey: 'promotion_id',
        as: 'redemptions'
      });
      
      // Promotion rules
      this.hasMany(models.PromotionRule, {
        foreignKey: 'promotion_id',
        as: 'rules'
      });
    }
  }

  ProductPromotion.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true // Can be null for buy_x_get_y promotions
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    min_purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true // Null for unlimited
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_flash_sale: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    customer_eligibility: {
      type: DataTypes.ENUM('all', 'new', 'returning', 'loyalty'),
      allowNull: false,
      defaultValue: 'all'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
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
    }
  }, {
    sequelize,
    modelName: 'ProductPromotion',
    tableName: 'product_promotions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['merchant_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['code'],
        unique: true,
        where: {
          code: {
            [Op.ne]: null // Use Op.ne instead of DataTypes.Op.ne
          }
        }
      },
      {
        fields: ['start_date', 'end_date']
      },
      {
        fields: ['is_active']
      }
    ],
    hooks: {
      beforeValidate: (promotion) => {
        // Validate date range if both dates are provided
        if (promotion.start_date && promotion.end_date) {
          if (new Date(promotion.start_date) > new Date(promotion.end_date)) {
            throw new Error('End date must be after start date');
          }
        }
        
        // For percentage discounts, ensure value doesn't exceed 100
        if (promotion.type === 'percentage' && promotion.value > 100) {
          promotion.value = 100;
        }
      }
    }
  });

  return ProductPromotion;
};