'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('geofences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      coordinates: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      center: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      area: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.addIndex('geofences', ['name'], {
      name: 'geofences_name_index'
    });

    await queryInterface.addIndex('geofences', ['active'], {
      name: 'geofences_active_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('geofences', 'geofences_name_index');
    await queryInterface.removeIndex('geofences', 'geofences_active_index');

    // Drop the table
    await queryInterface.dropTable('geofences');
  }
};