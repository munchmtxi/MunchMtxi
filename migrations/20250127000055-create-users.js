'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if ENUM types exist and create them if they don't
    const enumQueries = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_country') THEN CREATE TYPE "enum_users_country" AS ENUM ('malawi', 'zambia', 'mozambique', 'tanzania'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_merchant_type') THEN CREATE TYPE "enum_users_merchant_type" AS ENUM ('grocery', 'restaurant'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_status') THEN CREATE TYPE "enum_users_status" AS ENUM ('active', 'inactive', 'suspended'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_location_source') THEN CREATE TYPE "enum_users_location_source" AS ENUM ('ip', 'gps', 'manual'); END IF; END $$;`
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
      detected_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Automatically detected location from IP/GPS',
      },
      manual_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'User-specified location override',
      },
      location_source: {
        type: Sequelize.ENUM('ip', 'gps', 'manual'),
        allowNull: true,
        comment: 'Source of the current location data',
      },
      location_updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
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
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_location_source";');
  },
};