'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const { getBusinessTypes } = require('@config/constants/businessTypes');
const { BUSINESS_TYPES } = getBusinessTypes(); // Add this line

module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasMany(models.Staff, { foreignKey: 'merchant_id', as: 'staff' });
      this.hasMany(models.Order, { foreignKey: 'merchant_id', as: 'orders' });
      this.hasMany(models.MenuInventory, { foreignKey: 'merchant_id', as: 'menu_items' });
      this.hasMany(models.Booking, { foreignKey: 'merchant_id', as: 'bookings' });
      this.hasMany(models.Payment, { foreignKey: 'merchant_id', as: 'payments' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.belongsTo(models.Geofence, { foreignKey: 'geofence_id', as: 'geofence' });
      this.hasMany(models.PasswordHistory, {
        foreignKey: 'user_id',
        constraints: false,
        scope: { user_type: 'merchant' },
      });
      this.hasMany(models.PasswordResetLog, {
        foreignKey: 'user_id',
        constraints: false,
        scope: { user_type: 'merchant' },
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

    format_business_hours() {
      if (!this.business_hours) return null;
      const { open, close } = this.business_hours;
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toLocaleTimeString('en-US', {
          timeZone: this.time_zone,
          hour: '2-digit',
          minute: '2-digit',
        });
      };
      return {
        open: open ? parseTime(open) : null,
        close: close ? parseTime(close) : null,
      };
    }

    getBusinessTypeConfig() {
      return BUSINESS_TYPES[this.business_type.toUpperCase()];
    }

    validateBusinessTypeDetails() {
      const typeConfig = this.getBusinessTypeConfig();
      console.log('Type Config:', typeConfig);
      if (!typeConfig) {
        console.log('No config found for type:', this.business_type);
        return false;
      }

      const details = this.business_type_details || {};
      console.log('Details:', details);
      
      const hasAllRequired = typeConfig.requiredFields.every(field => {
        const isPresent = details[field] !== undefined && details[field] !== null;
        console.log(`Field ${field}:`, { present: isPresent, value: details[field] });
        return isPresent;
      });

      const hasValidServices = details.service_types
        ? details.service_types.every(service => {
            const isValid = typeConfig.allowedServiceTypes.includes(service);
            console.log(`Service ${service}:`, { valid: isValid, allowed: typeConfig.allowedServiceTypes });
            return isValid;
          })
        : true;

      const hasRequiredLicenses = details.licenses
        ? typeConfig.requiredLicenses.every(license => {
            const isPresent = details.licenses.includes(license);
            console.log(`License ${license}:`, { present: isPresent, licenses: details.licenses });
            return isPresent;
          })
        : true;

      console.log('Validation:', { hasAllRequired, hasValidServices, hasRequiredLicenses });
      return hasAllRequired && hasValidServices && hasRequiredLicenses;
    }
  }

  Merchant.init({
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: { notNull: { msg: 'User ID is required' }, isInt: { msg: 'User ID must be an integer' } },
    },
    business_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Business name is required' } },
    },
    business_type: {
      type: DataTypes.ENUM('grocery', 'restaurant', 'cafe', 'bakery', 'butcher'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['grocery', 'restaurant', 'cafe', 'bakery', 'butcher']],
          msg: 'Invalid business type',
        },
      },
    },
    business_type_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidForType(value) {
          if (!value) return;
          const typeConfig = BUSINESS_TYPES[this.business_type.toUpperCase()];
          if (!typeConfig) {
            console.log('Validator: No config for', this.business_type);
            throw new Error('Invalid business type');
          }

          const missingFields = typeConfig.requiredFields.filter(field => !value[field]);
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }

          if (value.service_types) {
            const invalidServices = value.service_types.filter(
              service => !typeConfig.allowedServiceTypes.includes(service)
            );
            if (invalidServices.length > 0) {
              throw new Error(`Invalid service types: ${invalidServices.join(', ')}`);
            }
          }

          if (value.licenses) {
            const missingLicenses = typeConfig.requiredLicenses.filter(
              license => !value.licenses.includes(license)
            );
            if (missingLicenses.length > 0) {
              throw new Error(`Missing required licenses: ${missingLicenses.join(', ')}`);
            }
          }
        },
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Address is required' } },
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
            if (!phoneUtil.isValidNumber(number)) throw new Error('Invalid phone number format');
          } catch (error) {
            throw new Error('Invalid phone number format');
          }
        },
      },
    },
    last_password_update: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    password_strength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    failed_password_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    password_lock_until: { type: DataTypes.DATE, allowNull: true },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
      validate: { notEmpty: { msg: 'Currency is required' } },
    },
    time_zone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC',
      validate: { notEmpty: { msg: 'Time zone is required' } },
    },
    business_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidBusinessHours(value) {
          if (value && (!value.open || !value.close)) {
            throw new Error('Business hours must include both open and close times');
          }
        },
      },
    },
    notification_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: { orderUpdates: true, bookingNotifications: true, customerFeedback: true, marketingMessages: false },
    },
    whatsapp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    logo_url: { type: DataTypes.STRING, allowNull: true },
    banner_url: { type: DataTypes.STRING, allowNull: true },
    storefront_url: { type: DataTypes.STRING, allowNull: true },
    delivery_area: { type: DataTypes.JSONB, allowNull: true },
    location: { type: DataTypes.JSONB, allowNull: true },
    service_radius: { type: DataTypes.DECIMAL, allowNull: true },
    geofence_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'geofences', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Merchant',
    tableName: 'merchants',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['user_id'], name: 'merchants_user_id_unique' },
      { unique: true, fields: ['phone_number'], name: 'merchants_phone_number_unique' },
    ],
    hooks: {
      beforeValidate: async (merchant) => {
        console.log('BeforeValidate:', {
          business_type: merchant.business_type,
          details: merchant.business_type_details,
          changed: merchant.changed()
        });
        if (merchant.changed('business_type') && merchant.business_type_details) {
          const isValid = merchant.validateBusinessTypeDetails();
          if (!isValid) {
            throw new Error('Business type details invalid for new business type');
          }
        }
      },
    },
  });

  return Merchant;
};