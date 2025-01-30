'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.hasMany(models.Order, {
        foreignKey: 'customerId',
        as: 'orders',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'customerId',
        as: 'bookings',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'customerId',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'userId',
        as: 'notifications',
      });
    }

    formatPhoneForWhatsApp() {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      try {
        const number = phoneUtil.parse(this.phoneNumber);
        return `+${number.getCountryCode()}${number.getNationalNumber()}`;
      } catch (error) {
        throw new Error('Invalid phone number format');
      }
    }
  }

  Customer.init({
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
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Address is required' },
      },
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    paymentMethods: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Customer',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['phoneNumber'],
      },
    ],
  });

  return Customer;
};
