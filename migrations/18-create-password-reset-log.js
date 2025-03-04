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
        allowNull: true, // Nullable because logs may exist for failed attempts without a user
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add index for user_id
    await queryInterface.addIndex('password_reset_logs', {
      fields: ['user_id'],
      name: 'password_reset_logs_user_id_index',
    });

    // Add index for status
    await queryInterface.addIndex('password_reset_logs', {
      fields: ['status'],
      name: 'password_reset_logs_status_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the password_reset_logs table if the migration is rolled back
    await queryInterface.dropTable('password_reset_logs');
  },
};