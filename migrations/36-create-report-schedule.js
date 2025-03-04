'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('report_schedules', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      report_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      frequency: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      filters: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      next_run_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      last_run_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'active',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      error_log: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
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
    await queryInterface.addIndex('report_schedules', {
      fields: ['user_id'],
      name: 'report_schedules_user_id_index',
    });

    // Add index for merchant_id
    await queryInterface.addIndex('report_schedules', {
      fields: ['merchant_id'],
      name: 'report_schedules_merchant_id_index',
    });

    // Add index for next_run_at
    await queryInterface.addIndex('report_schedules', {
      fields: ['next_run_at'],
      name: 'report_schedules_next_run_at_index',
    });

    // Add index for status
    await queryInterface.addIndex('report_schedules', {
      fields: ['status'],
      name: 'report_schedules_status_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the report_schedules table if the migration is rolled back
    await queryInterface.dropTable('report_schedules');
  },
};