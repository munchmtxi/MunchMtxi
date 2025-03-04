'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('routes', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      origin: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      destination: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      waypoints: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      distance: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      duration: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      polyline: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      traffic_model: {
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

    // Add composite index for origin and destination
    await queryInterface.addIndex('routes', {
      fields: ['origin', 'destination'],
      name: 'routes_origin_destination_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the routes table if the migration is rolled back
    await queryInterface.dropTable('routes');
  },
};