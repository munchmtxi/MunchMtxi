'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const { getBusinessTypes } = require('@config/constants/businessTypes');


module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.hasMany(models.Staff, {
        foreignKey: 'merchant_id',
        as: 'staff',
      });
      this.hasMany(models.Order, {
        foreignKey: 'merchant_id',
        as: 'orders',
      });
      this.hasMany(models.MenuInventory, {
        foreignKey: 'merchant_id',
        as: 'menu_items',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'merchant_id',
        as: 'bookings',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'merchant_id',
        as: 'payments',
      });
      this.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications',
      });
      this.belongsTo(models.Geofence, {
        foreignKey: 'geofence_id',
        as: 'geofence'
      });
      
      // Password management associations
      this.hasMany(models.PasswordHistory, {
        foreignKey: 'user_id',
        constraints: false,
        scope: {
          user_type: 'merchant'
        }
      });
      this.hasMany(models.PasswordResetLog, {
        foreignKey: 'user_id',
        constraints: false,
        scope: {
          user_type: 'merchant'
        }
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
      return {
        open: this.business_hours?.open?.toLocaleTimeString('en-US', { 
          timeZone: this.time_zone,
          hour: '2-digit',
          minute: '2-digit'
        }),
        close: this.business_hours?.close?.toLocaleTimeString('en-US', {
          timeZone: this.time_zone,
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }

    getBusinessTypeConfig() {
      return BUSINESS_TYPES[this.business_type.toUpperCase()];
    }

    validateBusinessTypeDetails() {
      const typeConfig = this.getBusinessTypeConfig();
      if (!typeConfig) return false;

      const details = this.business_type_details || {};
      
      // Check required fields
      const hasAllRequired = typeConfig.requiredFields.every(field => 
        details[field] !== undefined && details[field] !== null
      );

      // Check service types
      const hasValidServices = details.service_types?.every(service =>
        typeConfig.allowedServiceTypes.includes(service)
      );

      // Check licenses
      const hasRequiredLicenses = typeConfig.requiredLicenses.every(license =>
        details.licenses?.includes(license)
      );

      return hasAllRequired && hasValidServices && hasRequiredLicenses;
    }
  }

  Merchant.init({
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
    business_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Business name is required' },
      },
    },
    business_type: {
      type: DataTypes.ENUM('grocery', 'restaurant', 'cafe', 'bakery', 'butcher'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['grocery', 'restaurant', 'cafe', 'bakery', 'butcher']],
          msg: 'Invalid business type'
        }
      }
    },
    business_type_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidForType(value) {
          if (!value) return;

          try {
            const { BUSINESS_TYPES } = require('../config/constants/businessTypes');
            const typeConfig = BUSINESS_TYPES[this.business_type.toUpperCase()];
            
            if (!typeConfig) return;  // Skip validation if type config not found

            // Validate required fields
            const missingFields = typeConfig.requiredFields.filter(field => !value[field]);
            if (missingFields.length > 0) {
              throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Validate service types if present
            if (value.service_types) {
              const invalidServices = value.service_types.filter(
                service => !typeConfig.allowedServiceTypes.includes(service)
              );
              if (invalidServices.length > 0) {
                throw new Error(`Invalid service types: ${invalidServices.join(', ')}`);
              }
            }

            // Validate licenses if present
            if (value.licenses) {
              const missingLicenses = typeConfig.requiredLicenses.filter(
                license => !value.licenses.includes(license)
              );
              if (missingLicenses.length > 0) {
                throw new Error(`Missing required licenses: ${missingLicenses.join(', ')}`);
              }
            }
          } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
              // Skip validation if constants file not found
              return;
            }
            throw error;
          }
        }
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Address is required' },
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
    // Password management fields
    last_password_update: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    password_strength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    failed_password_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    password_lock_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        notEmpty: { msg: 'Currency is required' },
      },
    },
    time_zone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC',
      validate: {
        notEmpty: { msg: 'Time zone is required' },
      },
    },
    business_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidBusinessHours(value) {
          if (value && (!value.open || !value.close)) {
            throw new Error('Business hours must include both open and close times');
          }
        }
      }
    },
    notification_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        orderUpdates: true,
        bookingNotifications: true,
        customerFeedback: true,
        marketingMessages: false
      }
    },
    whatsapp_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bannerUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    storefrontUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    delivery_area: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true
    }, 
    service_radius: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    geofence_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'geofences',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Merchant',
    tableName: 'merchants',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'merchants_user_id_unique'
      },
      {
        unique: true,
        fields: ['phone_number'],
        name: 'merchants_phone_number_unique'
      }
    ],
    hooks: {
      beforeValidate: async (merchant) => {
        if (merchant.changed('business_type') && merchant.business_type_details) {
          // Revalidate business type details when type changes
          const isValid = merchant.validateBusinessTypeDetails();
          if (!isValid) {
            throw new Error('Business type details invalid for new business type');
          }
        }
      }
    }
  });

  return Merchant;
};
