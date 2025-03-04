'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('geofence_events', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      geofenceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'geofences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      eventType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex('geofence_events', ['geofenceId'], {
      name: 'geofence_events_geofence_id_index',
    });

    await queryInterface.addIndex('geofence_events', ['eventType'], {
      name: 'geofence_events_event_type_index',
    });

    await queryInterface.addIndex('geofence_events', ['created_at'], {
      name: 'geofence_events_created_at_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('geofence_events');
  },
};