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

    getWhatsAppTemplateForStatus() {
      const templateMap = {
        'CONFIRMED': 'order_confirmed',
        'PREPARING': 'order_preparing',
        'READY': 'order_ready',
        'OUT_FOR_DELIVERY': 'order_out_for_delivery',
        'DELIVERED': 'order_delivered',
        'CANCELLED': 'order_cancelled'
      };
      return templateMap[this.status];
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
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    estimatedArrival: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
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
