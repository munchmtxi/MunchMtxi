'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_active_viewers', {
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
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      socket_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      last_activity: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      viewer_type: {
        type: Sequelize.ENUM('guest', 'customer', 'merchant', 'staff'),
        defaultValue: 'guest',
        allowNull: false,
      },
      viewer_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'idle', 'disconnected'),
        defaultValue: 'active',
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

    // Add index for merchant_id and status
    await queryInterface.addIndex('merchant_active_viewers', {
      fields: ['merchant_id', 'status'],
      name: 'idx_merchant_viewer_status',
    });

    // Add index for socket_id
    await queryInterface.addIndex('merchant_active_viewers', {
      fields: ['socket_id'],
      name: 'idx_merchant_viewer_socket',
    });

    // Add index for session_id
    await queryInterface.addIndex('merchant_active_viewers', {
      fields: ['session_id'],
      name: 'idx_merchant_viewer_session',
    });

    // Add index for last_activity
    await queryInterface.addIndex('merchant_active_viewers', {
      fields: ['last_activity'],
      name: 'idx_merchant_viewer_last_activity',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_active_viewers table if the migration is rolled back
    await queryInterface.dropTable('merchant_active_viewers');
  },
};