// models/booking.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'bookingId',
        as: 'notifications',
      });
    }
  }

  Booking.init({
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
    bookingType: {
      type: DataTypes.ENUM('table', 'taxi'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['table', 'taxi']],
          msg: 'Booking type must be either table or taxi',
        },
      },
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'denied', 'seated', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
  }, {
    sequelize,
    modelName: 'Booking',
    timestamps: true,
    paranoid: true,
  });

  return Booking;
};
