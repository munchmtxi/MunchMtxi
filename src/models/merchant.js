'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');

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
    }

    // Method to format phone number for WhatsApp
    format_phone_for_whatsapp() {
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
      try {
        const number = phoneUtil.parse(this.phone_number);
        return `+${number.getCountryCode()}${number.getNationalNumber()}`;
      } catch (error) {
        throw new Error('Invalid phone number format');
      }
    }

    // Method to format business hours according to timezone
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
  });

  return Merchant;
};