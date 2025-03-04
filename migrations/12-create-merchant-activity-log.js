'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_activity_logs', {
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
      actor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'devices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      security_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      previous_hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add composite index for merchant_id and created_at
    await queryInterface.addIndex('merchant_activity_logs', {
      fields: ['merchant_id', 'created_at'],
      name: 'idx_merchant_activity_time',
    });

    // Add index for actor_id
    await queryInterface.addIndex('merchant_activity_logs', {
      fields: ['actor_id'],
      name: 'idx_merchant_activity_actor',
    });

    // Add index for event_type
    await queryInterface.addIndex('merchant_activity_logs', {
      fields: ['event_type'],
      name: 'idx_merchant_activity_event',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_activity_logs table if the migration is rolled back
    await queryInterface.dropTable('merchant_activity_logs');
  },
};