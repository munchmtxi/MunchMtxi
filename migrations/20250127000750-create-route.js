'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('routes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      origin: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      destination: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      waypoints: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      distance: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      duration: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      polyline: {
        type: Sequelize.STRING,
        allowNull: true
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      traffic_model: {
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

    // Add composite index on origin and destination
    await queryInterface.addIndex('routes', ['origin', 'destination'], {
      name: 'routes_origin_destination_index',
      using: 'gin'  // Using GIN index for JSONB columns
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('routes', 'routes_origin_destination_index');

    // Drop the table
    await queryInterface.dropTable('routes');
  }
};