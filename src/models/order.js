// models/order.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'orderId',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'orderId',
        as: 'notifications',
      });
      this.belongsToMany(models.MenuInventory, {
        through: models.OrderItems,
        foreignKey: 'orderId',
        otherKey: 'menuItemId',
        as: 'items',
      });
    }
  }

  Order.init({
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Customers',
        key: 'id',
      },
      validate: {
        notNull: { msg: 'Customer ID is required' },
        isInt: { msg: 'Customer ID must be an integer' },
      },
    },
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
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Drivers',
        key: 'id',
      },
      validate: {
        isInt: { msg: 'Driver ID must be an integer' },
      },
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Items are required' },
      },
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Total amount must be positive',
        },
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
  }, {
    sequelize,
    modelName: 'Order',
    timestamps: true,
    paranoid: true,
  });

  return Order;
};
