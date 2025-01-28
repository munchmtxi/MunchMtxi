// models/merchant.js
'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.hasMany(models.Staff, {
        foreignKey: 'merchantId',
        as: 'staff',
      });
      this.hasMany(models.Order, {
        foreignKey: 'merchantId',
        as: 'orders',
      });
      this.hasMany(models.MenuInventory, {
        foreignKey: 'merchantId',
        as: 'menuItems',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'merchantId',
        as: 'bookings',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'merchantId',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'userId',
        as: 'notifications',
      });
    }
  }

  Merchant.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' },
      },
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Business name is required' },
      },
    },
    businessType: {
      type: DataTypes.ENUM('grocery', 'restaurant'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['grocery', 'restaurant']],
          msg: 'Business type must be either grocery or restaurant',
        },
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Address is required' },
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Phone number is required' },
        isPhoneNumber(value) {
          const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
          try {
            const number = phoneUtil.parse(value);
            if (!phoneUtil.isValidNumber(number)) {
              throw new Error('Invalid phone number format');
            }
          } catch (error) {
            throw new Error('Invalid phone number format');
          }
        },
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        notEmpty: { msg: 'Currency is required' },
      },
    },
    timeZone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC',
      validate: {
        notEmpty: { msg: 'Time zone is required' },
      },
    },
  }, {
    sequelize,
    modelName: 'Merchant',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['phoneNumber'],
      },
    ],
  });

  return Merchant;
};
