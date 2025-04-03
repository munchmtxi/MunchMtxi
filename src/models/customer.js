'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.hasMany(models.Order, {
        foreignKey: 'customer_id',
        as: 'orders',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'customer_id',
        as: 'bookings',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'customer_id',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications',
      });
      this.belongsTo(models.Address, {
        foreignKey: 'default_address_id',
        as: 'defaultAddress',
      });

      this.hasMany(models.Ride, {  // Added
        foreignKey: 'customerId',
        as: 'rides',
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

  Customer.init({
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
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Address is required' },
      },
    },
    country: { // Added country field
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'MWI', // Default to Malawi
      validate: {
        notEmpty: { msg: 'Country is required' },
        len: [2, 3], // ISO Alpha-2 or Alpha-3 codes
      },
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    payment_methods: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    saved_addresses: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    default_address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'addresses',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    last_known_location: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    },
  }, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'customers_user_id_unique',
      },
      {
        unique: true,
        fields: ['phone_number'],
        name: 'customers_phone_number_unique',
      },
      {
        fields: ['default_address_id'],
        name: 'customers_default_address_id_index',
      },
    ],
  });

  return Customer;
};