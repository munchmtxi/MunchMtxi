'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_hotspots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      center: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      points: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      radius: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      popular_times: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      nearby_places: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      total_deliveries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      timeframe: {
        type: Sequelize.STRING,
        allowNull: false
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

    // Add index on timeframe
    await queryInterface.addIndex('delivery_hotspots', ['timeframe'], {
      name: 'delivery_hotspots_timeframe_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('delivery_hotspots', 'delivery_hotspots_timeframe_index');

    // Drop the table
    await queryInterface.dropTable('delivery_hotspots');
  }
};