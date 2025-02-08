'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('route_optimizations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      total_distance: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      total_duration: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      optimized_order: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      polyline: {
        type: Sequelize.STRING,
        allowNull: true
      },
      driver_location: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      delivery_ids: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
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

    // Add index on created_at for performance on time-based queries
    await queryInterface.addIndex('route_optimizations', ['created_at'], {
      name: 'route_optimizations_created_at_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('route_optimizations', 'route_optimizations_created_at_index');

    // Drop the table
    await queryInterface.dropTable('route_optimizations');
  }
};