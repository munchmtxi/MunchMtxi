// migrations/20250127000400-create-user.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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
      phone: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },
      country: {
        type: Sequelize.ENUM('malawi', 'zambia', 'mozambique', 'tanzania'),
        allowNull: false,
      },
      merchant_type: {
        type: Sequelize.ENUM('grocery', 'restaurant'),
        allowNull: true,
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['phone'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_country";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_merchant_type";');
  }
};