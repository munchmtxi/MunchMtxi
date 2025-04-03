'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.hasMany(models.Order, {
        foreignKey: 'driver_id',
        as: 'orders',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'driver_id',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications',
      });
      // Added new association
      this.belongsTo(models.Route, {
        foreignKey: 'active_route_id',
        as: 'activeRoute',
      });
    }

    format_phone_for_whatsapp() {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      try {
        const number = phoneUtil.parse(this.phone_number);
        return `+${number.getCountryCode()}${number.getNationalNumber()}`;
      } catch (error) {
        throw new Error('Invalid phone number format');
      }
    }
  }

  Driver.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    phone_number: {
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
    vehicle_info: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vehicle information is required' },
      },
    },
    license_number: {
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
    availability_status: {
      type: DataTypes.ENUM('available', 'unavailable', 'busy'), // Updated to include 'busy'
      allowNull: false,
      defaultValue: 'available',
    },
    // Modified and added location tracking fields
    current_location: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    last_location_update: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    active_route_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'routes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    service_area: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    preferred_zones: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // New fields added for enhancements
    status: {
      type: DataTypes.ENUM('active', 'busy'),
      allowNull: false,
      defaultValue: 'active',
    },
    rating: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    total_rides: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_deliveries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'drivers_user_id_unique',
      },
      {
        unique: true,
        fields: ['phone_number'],
        name: 'drivers_phone_number_unique',
      },
      {
        unique: true,
        fields: ['license_number'],
        name: 'drivers_license_number_unique',
      },
      {
        fields: ['active_route_id'],
        name: 'drivers_active_route_id_index',
      }
    ],
  });

  // Add hook to update availability_status based on DriverAvailability
  Driver.addHook('afterUpdate', async (driver, options) => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    const { Op } = sequelize;
    const { DriverAvailability } = sequelize.models;

    const availability = await DriverAvailability.findOne({
      where: {
        driver_id: driver.id,
        date: currentDate,
        start_time: { [Op.lte]: currentTime },
        end_time: { [Op.gte]: currentTime },
      },
      order: [['lastUpdated', 'DESC']],
    });

    if (availability) {
      driver.availability_status = availability.status === 'available' ? 'available' : 'unavailable';
      await driver.save({ hooks: false }); // Avoid infinite loop
    }
  });

  return Driver;
};
