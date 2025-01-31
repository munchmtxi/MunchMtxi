'use strict';
const { Model } = require('sequelize');
const libphonenumber = require('google-libphonenumber');
const bcrypt = require('bcryptjs');

// Utility function for phone number validation
const validatePhoneNumber = (value) => {
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
};

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
        foreignKey: 'manager_id',
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
      this.hasMany(models.PasswordHistory, {
        foreignKey: 'user_id',
        as: 'password_history',
      });
    }

    getFullName() {
      return `${this.first_name} ${this.last_name}`;
    }

    valid_password(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init(
    {
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
          isValidPassword(value) {
            const passwordValidator = require('password-validator');
            const schema = new passwordValidator();
            schema
              .is().min(8)
              .is().max(100)
              .has().uppercase()
              .has().lowercase()
              .has().digits()
              .has().symbols();
            if (!schema.validate(value)) {
              throw new Error('Password does not meet complexity requirements');
            }
          },
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
            validatePhoneNumber(value);
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
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
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
        validate: {
          isValidManager(value) {
            if (value && value === this.id) {
              throw new Error('A user cannot manage themselves');
            }
          },
        },
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
        validate: {
          isFutureDate(value) {
            if (value && new Date(value) <= new Date()) {
              throw new Error('Password reset expiration must be in the future');
            }
          },
        },
      },
      avatar_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_login_at: {
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
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: ['password', 'two_factor_secret', 'password_reset_token', 'password_reset_expires'],
        },
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
            // Log the old password hash
            const oldPassword = user.previous('password');
            if (oldPassword) {
              await sequelize.models.PasswordHistory.create({
                user_id: user.id,
                password_hash: oldPassword,
              });
            }
          }
        },
        beforeSave: async (user) => {
          if (user.manager_id === user.id) {
            throw new Error('A user cannot manage themselves');
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
    }
  );
  return User;
};