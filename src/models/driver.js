// models/driver.js
'use strict';
const { Model } = require('sequelize');

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
  });

  return Driver;
};
