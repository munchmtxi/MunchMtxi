'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('devices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        }
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Device ID is required' },
        }
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Device type is required' },
        }
      },
      os: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'OS cannot be empty if provided' },
        }
      },
      os_version: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'OS version cannot be empty if provided' },
        }
      },
      browser: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Browser cannot be empty if provided' },
        }
      },
      browser_version: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Browser version cannot be empty if provided' },
        }
      },
      screen_resolution: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Screen resolution cannot be empty if provided' },
        }
      },
      preferred_language: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          notEmpty: { msg: 'Preferred language cannot be empty if provided' },
        }
      },
      network_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'wifi, cellular, etc.'
      },
      network_speed: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '4g, 5g, etc.'
      },
      connection_quality: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'excellent, good, fair, poor'
      },
      supports_webp: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      preferred_response_format: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'json'
      },
      max_payload_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum preferred response size in bytes'
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ios, android, or web'
      },
      platform_version: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_pwa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      platform_features: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Platform-specific feature support'
      },
      device_memory: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Available device memory in GB'
      },
      hardware_concurrency: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of logical processors'
      },
      supported_apis: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Available Web APIs support'
      },
      last_used_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    }, {
      timestamps: true,
      paranoid: true,
    });

    await queryInterface.addConstraint('devices', {
      fields: ['user_id', 'device_id'],
      type: 'unique',
      name: 'unique_user_device'
    });

    await queryInterface.addIndex('devices', ['os'], {
      name: 'idx_devices_os'
    });

    await queryInterface.addIndex('devices', ['browser'], {
      name: 'idx_devices_browser'
    });

    await queryInterface.addIndex('devices', ['device_type'], {
      name: 'idx_devices_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('devices', 'idx_devices_os');
    await queryInterface.removeIndex('devices', 'idx_devices_browser');
    await queryInterface.removeIndex('devices', 'idx_devices_type');
    await queryInterface.removeConstraint('devices', 'unique_user_device');
    await queryInterface.dropTable('devices');
  }
};