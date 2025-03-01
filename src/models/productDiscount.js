'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductDiscount extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'menuItem'
      });
      
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  ProductDiscount.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'menu_inventories',
        key: 'id'
      }
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('percentage', 'flat', 'bogo', 'seasonal', 'loyalty', 'bulk_discount', 'early_bird', 'clearance'),
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
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
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    max_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    customer_type: {
      type: DataTypes.ENUM('all', 'new', 'returning', 'loyalty'),
      allowNull: false,
      defaultValue: 'all'
    },
    coupon_code: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'ProductDiscount',
    tableName: 'product_discounts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['menu_item_id']
      },
      {
        fields: ['merchant_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['start_date', 'end_date']
      },
      {
        fields: ['is_active']
      }
    ],
    hooks: {
      beforeValidate: (discount) => {
        // Validate date range if both dates are provided
        if (discount.start_date && discount.end_date) {
          if (new Date(discount.start_date) > new Date(discount.end_date)) {
            throw new Error('End date must be after start date');
          }
        }
        
        // Validate quantity range if both are provided
        if (discount.min_quantity !== null && discount.max_quantity !== null) {
          if (discount.min_quantity > discount.max_quantity) {
            throw new Error('Maximum quantity must be greater than or equal to minimum quantity');
          }
        }
        
        // For percentage discounts, ensure value doesn't exceed 100
        if (discount.type === 'percentage' && discount.value > 100) {
          discount.value = 100;
        }
      }
    }
  });

  return ProductDiscount;
};