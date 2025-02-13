// migrations/YYYYMMDDHHMMSS-create-report-schedules.js
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
        validate: {
          isIn: [['orders', 'drivers', 'merchants', 'inventory', 'sales']]
        }
      },
      frequency: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isIn: [['daily', 'weekly', 'monthly', 'quarterly']]
        }
      },
      filters: {
        type: Sequelize.JSON,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      next_run_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      last_run_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'active'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'merchants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      error_log: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('report_schedules', ['user_id'], {
      name: 'report_schedules_user_id_index'
    });

    await queryInterface.addIndex('report_schedules', ['merchant_id'], {
      name: 'report_schedules_merchant_id_index'
    });

    await queryInterface.addIndex('report_schedules', ['next_run_at'], {
      name: 'report_schedules_next_run_at_index'
    });

    await queryInterface.addIndex('report_schedules', ['status'], {
      name: 'report_schedules_status_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('report_schedules', 'report_schedules_user_id_index');
    await queryInterface.removeIndex('report_schedules', 'report_schedules_merchant_id_index');
    await queryInterface.removeIndex('report_schedules', 'report_schedules_next_run_at_index');
    await queryInterface.removeIndex('report_schedules', 'report_schedules_status_index');

    // Drop the ENUM type after dropping the table
    await queryInterface.dropTable('report_schedules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_report_schedules_status;');
  }
};