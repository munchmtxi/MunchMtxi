'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Status is required' },
          isIn: {
            args: [['success', 'failed']],
            msg: 'Status must be either success or failed',
          },
        }
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'IP address is required' },
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding indexes
    await queryInterface.addIndex('password_reset_logs', ['user_id']);
    await queryInterface.addIndex('password_reset_logs', ['status']);
  },
  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('password_reset_logs', 'password_reset_logs_user_id');
    await queryInterface.removeIndex('password_reset_logs', 'password_reset_logs_status');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_password_reset_logs_status";');

    // Drop the table
    await queryInterface.dropTable('password_reset_logs');
  }
};