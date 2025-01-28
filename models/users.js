// models/user.js
'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const bcrypt = require('bcryptjs'); // Ensure 'bcryptjs' is installed

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'role',
      });
      this.hasOne(models.Customer, {
        foreignKey: 'userId',
        as: 'customerProfile',
      });
      this.hasOne(models.Merchant, {
        foreignKey: 'userId',
        as: 'merchantProfile',
      });
      this.hasOne(models.Staff, {
        foreignKey: 'userId',
        as: 'staffProfile',
      });
      this.hasOne(models.Driver, {
        foreignKey: 'userId',
        as: 'driverProfile',
      });
      this.belongsTo(models.User, { 
        as: 'managedBy', 
        foreignKey: 'managerId' 
      });
      this.hasMany(models.Notification, {
        foreignKey: 'userId',
        as: 'notifications',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'customerId',
        as: 'customerPayments',
      });
      this.hasMany(models.Payment, {
        foreignKey: 'driverId',
        as: 'driverPayments',
      });
      this.hasMany(models.Report, {
        foreignKey: 'generatedBy',
        as: 'reports',
      });
      this.hasMany(models.Device, {
        foreignKey: 'userId',
        as: 'devices',
      });
    }

    // Method to compare passwords
    validPassword(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init({
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name is required' },
        len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' },
      },
    },
    lastName: {
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
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    googleLocation: {
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
    merchantType: {
      type: DataTypes.ENUM('grocery', 'restaurant'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['grocery', 'restaurant']],
          msg: 'Merchant type must be either grocery or restaurant',
        },
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'User',
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['password', 'twoFactorSecret', 'passwordResetToken', 'passwordResetExpires'] },
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
