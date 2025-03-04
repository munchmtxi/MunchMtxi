'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('branch_activities', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activity_type: {
        type: Sequelize.ENUM(
          'profile_update',
          'hours_update',
          'location_update',
          'media_update',
          'settings_update',
          'payment_update',
          'staff_update'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add composite index for branch_id and created_at
    await queryInterface.addIndex('branch_activities', {
      fields: ['branch_id', 'created_at'],
      name: 'branch_activities_branch_created_at_index',
    });

    // Add index for user_id
    await queryInterface.addIndex('branch_activities', {
      fields: ['user_id'],
      name: 'branch_activities_user_id_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the branch_activities table if the migration is rolled back
    await queryInterface.dropTable('branch_activities');
  },
};