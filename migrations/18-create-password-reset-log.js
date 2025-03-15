// migrations/20250314-create-password-reset-logs.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('password_reset_logs', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'merchant',
      },
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: { // Added
        type: Sequelize.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('password_reset_logs', {
      fields: ['user_id'],
      name: 'password_reset_logs_user_id_index',
    });

    await queryInterface.addIndex('password_reset_logs', {
      fields: ['status'],
      name: 'password_reset_logs_status_index',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('password_reset_logs');
  },
};