'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staff', {
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
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      position: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      manager_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_area: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Assigned area as a geofence',
      },
      work_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Work location as {lat, lng}',
      },
      geofence_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'geofences',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    await queryInterface.addIndex('staff', {
      fields: ['user_id'],
      unique: true,
      name: 'staff_user_id_unique',
    });

    // Add index for geofence_id
    await queryInterface.addIndex('staff', {
      fields: ['geofence_id'],
      name: 'staff_geofence_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the staff table if the migration is rolled back
    await queryInterface.dropTable('staff');
  },
};