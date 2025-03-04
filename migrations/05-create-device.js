'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('devices', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      device_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      remember_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      remember_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_active_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      os: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      os_version: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      browser: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      browser_version: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      screen_resolution: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      preferred_language: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      network_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'wifi, cellular, etc.',
      },
      network_speed: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '4g, 5g, etc.',
      },
      connection_quality: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'excellent, good, fair, poor',
      },
      supports_webp: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      preferred_response_format: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'json',
      },
      max_payload_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum preferred response size in bytes',
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ios, android, or web',
      },
      platform_version: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_pwa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      platform_features: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Platform-specific feature support',
      },
      device_memory: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Available device memory in GB',
      },
      hardware_concurrency: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of logical processors',
      },
      supported_apis: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Available Web APIs support',
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    // Add unique index for user_id and device_id
    await queryInterface.addIndex('devices', {
      unique: true,
      fields: ['user_id', 'device_id'],
      name: 'unique_user_device',
    });

    // Add index for platform
    await queryInterface.addIndex('devices', {
      fields: ['platform'],
      name: 'idx_platform',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the devices table if the migration is rolled back
    await queryInterface.dropTable('devices');
  },
};