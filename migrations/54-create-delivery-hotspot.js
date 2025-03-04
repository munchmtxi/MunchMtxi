'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_hotspots', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      center: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      points: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      radius: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      popularTimes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      nearbyPlaces: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      totalDeliveries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      timeframe: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('delivery_hotspots', ['timeframe'], { name: 'delivery_hotspots_timeframe_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('delivery_hotspots');
  },
};