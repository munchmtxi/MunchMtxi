'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InventoryAlert extends Model {
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
        foreignKey: 'resolved_by',
        as: 'resolver'
      });
    }
  }

  InventoryAlert.init({
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
    type: {
      type: DataTypes.ENUM('low_stock', 'out_of_stock', 'over_stock', 'expiring'),
      allowNull: false,
      defaultValue: 'low_stock'
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    resolved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resolved_at: {
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
    modelName: 'InventoryAlert',
    tableName: 'inventory_alerts',
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
        fields: ['branch_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['resolved']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return InventoryAlert;
};