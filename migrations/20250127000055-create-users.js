'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if ENUM types exist and create them if they don't
    const enumQueries = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_country') THEN CREATE TYPE "enum_users_country" AS ENUM ('malawi', 'zambia', 'mozambique', 'tanzania'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_merchant_type') THEN CREATE TYPE "enum_users_merchant_type" AS ENUM ('grocery', 'restaurant'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_status') THEN CREATE TYPE "enum_users_status" AS ENUM ('active', 'inactive', 'suspended'); END IF; END $$;`,
    ];

    for (const query of enumQueries) {
      await queryInterface.sequelize.query(query);
    }

    // Create the users table
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'First name is required' },
          len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' },
        },
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Last name is required' },
          len: { args: [2, 50], msg: 'Last name must be between 2 and 50 characters' },
        },
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email is required' },
        },
      },
      password: {
        type: Sequelize.STRING,
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
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      google_location: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
        validate: {
          isPhoneNumber(value) {
            if (value) {
              const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
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
        type: Sequelize.ENUM('malawi', 'zambia', 'mozambique', 'tanzania'),
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
        type: Sequelize.ENUM('grocery', 'restaurant'),
        allowNull: true,
        validate: {
          isIn: {
            args: [['grocery', 'restaurant']],
            msg: 'Merchant type must be either grocery or restaurant',
          },
        },
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
      manager_id: {
        type: Sequelize.INTEGER,
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
        type: Sequelize.STRING,
        allowNull: true,
      },
      password_reset_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password_reset_expires: {
        type: Sequelize.DATE,
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
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['phone'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    // Drop the users table
    await queryInterface.dropTable('users');

    // Drop the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_country";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_merchant_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  },
};