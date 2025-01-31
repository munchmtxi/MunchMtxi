'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuInventory extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsToMany(models.Order, {
        through: models.OrderItems,
        foreignKey: 'menu_item_id',
        otherKey: 'order_id',
        as: 'orders',
      });
    }
  }

  MenuInventory.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Merchant ID is required' },
        isInt: { msg: 'Merchant ID must be an integer' },
      },
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Item name is required' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price must be positive',
        },
      },
    },
    stock_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Stock level cannot be negative',
        },
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
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
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MenuInventory',
    tableName: 'menu_inventories',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['merchant_id'],
        name: 'menu_inventories_merchant_id_index'
      }
    ]
  });

  return MenuInventory;
};