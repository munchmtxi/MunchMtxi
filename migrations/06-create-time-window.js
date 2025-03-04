'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('time_windows', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      interval: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      estimates: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      average_duration: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      traffic_conditions: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      optimal_window: {
        type: Sequelize.STRING,
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
    });

    // Add index for the 'interval' column
    await queryInterface.addIndex('time_windows', {
      fields: ['interval'],
      name: 'idx_interval',
    });

    // Add index for the 'optimal_window' column
    await queryInterface.addIndex('time_windows', {
      fields: ['optimal_window'],
      name: 'idx_optimal_window',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the time_windows table if the migration is rolled back
    await queryInterface.dropTable('time_windows');
  },
};