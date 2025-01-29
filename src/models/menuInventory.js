// models/menuInventory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuInventory extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant',
      });
      this.belongsToMany(models.Order, {
        through: models.OrderItems,
        foreignKey: 'menuItemId',
        otherKey: 'orderId',
        as: 'orders',
      });
    }
  }

  MenuInventory.init({
    merchantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Merchants',
        key: 'id',
      },
      validate: {
        notNull: { msg: 'Merchant ID is required' },
        isInt: { msg: 'Merchant ID must be an integer' },
      },
    },
    itemName: {
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
    stockLevel: {
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
  }, {
    sequelize,
    modelName: 'MenuInventory',
    timestamps: true,
    paranoid: true,
  });

  return MenuInventory;
};
