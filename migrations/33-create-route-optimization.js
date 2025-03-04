'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('route_optimizations', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      totalDistance: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      totalDuration: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      optimizedOrder: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      polyline: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      driverLocation: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      deliveryIds: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
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

    // Add index for created_at
    await queryInterface.addIndex('route_optimizations', {
      fields: ['created_at'],
      name: 'route_optimizations_created_at_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('route_optimizations');
  },
};