'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_profile_analytics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      viewer_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Can be null for anonymous views
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      source: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'direct',
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      view_duration: {
        type: Sequelize.INTEGER, // in seconds
        allowNull: true,
      },
      interaction_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      is_unique: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      location_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      view_type: {
        type: Sequelize.ENUM('profile', 'menu', 'reviews', 'photos'),
        defaultValue: 'profile',
        allowNull: false,
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

    // Add composite index for merchant_id and created_at
    await queryInterface.addIndex('merchant_profile_analytics', {
      fields: ['merchant_id', 'created_at'],
      name: 'idx_merchant_profile_time',
    });

    // Add index for session_id
    await queryInterface.addIndex('merchant_profile_analytics', {
      fields: ['session_id'],
      name: 'idx_merchant_profile_session',
    });

    // Add composite index for viewer_id, merchant_id, and created_at
    await queryInterface.addIndex('merchant_profile_analytics', {
      fields: ['viewer_id', 'merchant_id', 'created_at'],
      name: 'idx_merchant_profile_viewer_time',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_profile_analytics table if the migration is rolled back
    await queryInterface.dropTable('merchant_profile_analytics');
  },
};