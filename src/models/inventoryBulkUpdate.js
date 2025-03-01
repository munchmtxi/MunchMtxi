'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InventoryBulkUpdate extends Model {
    static associate(models) {
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

  InventoryBulkUpdate.init({
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchant_branches',
        key: 'id'
      }
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to the uploaded file if any'
    },
    file_type: {
      type: DataTypes.ENUM('csv', 'excel', 'json', 'manual'),
      allowNull: true
    },
    total_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    successful_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failed_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    error_details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    summary: {
      type: DataTypes.JSONB,
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
    modelName: 'InventoryBulkUpdate',
    tableName: 'inventory_bulk_updates',
    timestamps: true,
    underscored: true,
    indexes: [
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
        fields: ['created_at']
      }
    ]
  });

  return InventoryBulkUpdate;
};