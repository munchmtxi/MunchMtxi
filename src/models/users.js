// models/user.js
'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
      });
      this.hasOne(models.Customer, {
        foreignKey: 'user_id',
        as: 'customer_profile',
      });
      this.hasOne(models.Merchant, {
        foreignKey: 'user_id',
        as: 'merchant_profile',
      });
      this.hasOne(models.Staff, {
        foreignKey: 'user_id',
        as: 'staff_profile',
      });
      this.hasOne(models.Driver, {
        foreignKey: 'user_id',
        as: 'driver_profile',
      });
      this.belongsTo(models.User, { 
        as: 'managed_by', 
        foreignKey: 'manager_id' 
      });
      this.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'customer_id',
        as: 'customer_payments',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'driver_id',
        as: 'driver_payments',
      });
      this.hasMany(models.Report, {
        foreignKey: 'generated_by',
        as: 'reports',
      });
      this.hasMany(models.Device, {
        foreignKey: 'user_id',
        as: 'devices',
      });
    }

    valid_password(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name is required' },
        len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' },
      },
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Last name is required' },
        len: { args: [2, 50], msg: 'Last name must be between 2 and 50 characters' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: 'Email address already in use!' },
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
        notEmpty: { msg: 'Email is required' },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [6, 100], msg: 'Password must be at least 6 characters' },
        notEmpty: { msg: 'Password is required' },
      },
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    google_location: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isPhoneNumber(value) {
          if (value) {
            const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const number = phoneUtil.parse(value);
              if (!phoneUtil.isValidNumber(number)) {
                throw new Error('Invalid phone number format');
              }
            } catch (error) {
              throw new Error('Invalid phone number format');
            }
          }
        },
      },
    },
    country: {
      type: DataTypes.ENUM('malawi', 'zambia', 'mozambique', 'tanzania'),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Country is required' },
        isIn: {
          args: [['malawi', 'zambia', 'mozambique', 'tanzania']],
          msg: 'Country must be one of malawi, zambia, mozambique, tanzania',
        },
      },
    },
    merchant_type: {
      type: DataTypes.ENUM('grocery', 'restaurant'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['grocery', 'restaurant']],
          msg: 'Merchant type must be either grocery or restaurant',
        },
      },
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    two_factor_secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password_reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password_reset_expires: {
      type: DataTypes.DATE,
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
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['password', 'two_factor_secret', 'password_reset_token', 'password_reset_expires'] },
    },
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['phone'],
      },
    ],
  });

  return User;
};