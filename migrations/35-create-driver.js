'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('drivers', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      vehicle_info: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      license_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      routes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      availability_status: {
        type: Sequelize.ENUM('available', 'unavailable'),
        allowNull: false,
        defaultValue: 'available',
      },
      current_location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      last_location_update: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      active_route_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'routes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      service_area: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      preferred_zones: {
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add unique index for user_id
    await queryInterface.addIndex('drivers', {
      fields: ['user_id'],
      unique: true,
      name: 'drivers_user_id_unique',
    });

    // Add unique index for phone_number
    await queryInterface.addIndex('drivers', {
      fields: ['phone_number'],
      unique: true,
      name: 'drivers_phone_number_unique',
    });

    // Add unique index for license_number
    await queryInterface.addIndex('drivers', {
      fields: ['license_number'],
      unique: true,
      name: 'drivers_license_number_unique',
    });

    // Add index for active_route_id
    await queryInterface.addIndex('drivers', {
      fields: ['active_route_id'],
      name: 'drivers_active_route_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('drivers');
  },
};