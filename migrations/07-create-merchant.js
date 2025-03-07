'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchants', {
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
      business_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      business_type: {
        type: Sequelize.ENUM('grocery', 'restaurant', 'cafe', 'bakery', 'butcher'),
        allowNull: false,
      },
      business_type_details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      last_password_update: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      password_strength: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_password_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      password_lock_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD',
      },
      time_zone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC',
      },
      business_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      notification_preferences: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {
          orderUpdates: true,
          bookingNotifications: true,
          customerFeedback: true,
          marketingMessages: false,
        },
      },
      whatsapp_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      logo_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      banner_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      storefront_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      delivery_area: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      service_radius: {
        type: Sequelize.DECIMAL,
        allowNull: true,
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

    // Add unique indexes
    await queryInterface.addIndex('merchants', ['user_id'], {
      unique: true,
      name: 'merchants_user_id_unique',
    });
    await queryInterface.addIndex('merchants', ['phone_number'], {
      unique: true,
      name: 'merchants_phone_number_unique',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('merchants');
    // Clean up the ENUM type created for business_type (PostgreSQL only)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_merchants_business_type";');
  }
};
