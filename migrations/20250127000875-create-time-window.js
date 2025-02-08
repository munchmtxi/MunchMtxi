'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('time_windows', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      interval: {
        type: Sequelize.STRING,
        allowNull: false
      },
      estimates: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      average_duration: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      traffic_conditions: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      optimal_window: {
        type: Sequelize.STRING,
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('time_windows', ['interval'], {
      name: 'time_windows_interval_index'
    });

    await queryInterface.addIndex('time_windows', ['optimal_window'], {
      name: 'time_windows_optimal_window_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('time_windows', 'time_windows_interval_index');
    await queryInterface.removeIndex('time_windows', 'time_windows_optimal_window_index');

    // Drop the table
    await queryInterface.dropTable('time_windows');
  }
};