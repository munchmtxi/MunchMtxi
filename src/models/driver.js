'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.hasMany(models.Order, {
        foreignKey: 'driverId',
        as: 'orders',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'driverId',
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

  Driver.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
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
    vehicleInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vehicle information is required' },
      },
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'License number is required' },
      },
    },
    routes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    availabilityStatus: {
      type: DataTypes.ENUM('available', 'unavailable'),
      allowNull: false,
      defaultValue: 'available',
    },
    currentLocation: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Driver',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['phoneNumber'],
      },
    ],
  });

  return Driver;
};
