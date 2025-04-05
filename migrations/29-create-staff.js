'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table if it doesn't exist (for new installations) or add column if updating existing table
    const tableDefinition = await queryInterface.describeTable('staff').catch(() => null);

    if (tableDefinition) {
      // For existing table, add the new column
      await queryInterface.addColumn('staff', 'performance_metrics', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          points: 0,
          tier: 'Bronze',
          lastEvaluated: null,
          redemption_history: [],
        },
      });
    } else {
      // For new installations, create the table with the new column included
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
        availability_status: {
          type: Sequelize.ENUM('available', 'busy', 'on_break', 'offline'),
          allowNull: false,
          defaultValue: 'offline',
        },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'merchant_branches',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        performance_metrics: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {
            points: 0,
            tier: 'Bronze',
            lastEvaluated: null,
            redemption_history: [],
          },
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
    }

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
    // Check if the table exists before attempting to remove the column or table
    const tableDefinition = await queryInterface.describeTable('staff').catch(() => null);
    if (tableDefinition && tableDefinition.performance_metrics) {
      await queryInterface.removeColumn('staff', 'performance_metrics');
    }
  },
};
