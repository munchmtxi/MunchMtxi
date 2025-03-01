'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InventoryAdjustmentLog extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'product'
      });
      
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
      
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      this.belongsTo(models.User, {
        foreignKey: 'performed_by',
        as: 'performer'
      });
    }
  }

  InventoryAdjustmentLog.init({
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchant_branches',
        key: 'id'
      }
    },
    adjustment_type: {
      type: DataTypes.ENUM('add', 'subtract', 'set'),
      allowNull: false
    },
    previous_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    new_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    adjustment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reference_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference ID for order, bulk update, etc.'
    },
    reference_type: {
      type: DataTypes.ENUM('manual', 'order', 'bulk_update', 'import', 'system'),
      allowNull: false,
      defaultValue: 'manual'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'InventoryAdjustmentLog',
    tableName: 'inventory_adjustment_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        fields: ['menu_item_id']
      },
      {
        fields: ['merchant_id']
      },
      {
        fields: ['branch_id']
      },
      {
        fields: ['performed_by']
      },
      {
        fields: ['reference_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return InventoryAdjustmentLog;
};