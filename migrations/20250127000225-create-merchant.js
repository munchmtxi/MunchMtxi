'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        }
      },
      business_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Business name is required' },
        }
      },
      business_type: {
        type: Sequelize.ENUM('grocery', 'restaurant'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['grocery', 'restaurant']],
            msg: 'Business type must be either grocery or restaurant',
          }
        }
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Address is required' },
        }
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Phone number is required' },
          isPhoneNumber(value) {
            const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const number = phoneUtil.parse(value);
              if (!phoneUtil.isValidNumber(number)) {
                throw new Error('Invalid phone number format');
              }
            } catch (error) {
              throw new Error('Invalid phone number format');
            }
          }
        }
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD',
        validate: {
          notEmpty: { msg: 'Currency is required' },
        }
      },
      time_zone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC',
        validate: {
          notEmpty: { msg: 'Time zone is required' },
        }
      },
      business_hours: {
        type: Sequelize.JSON,
        allowNull: true,
        validate: {
          isValidBusinessHours(value) {
            if (value && (!value.open || !value.close)) {
              throw new Error('Business hours must include both open and close times');
            }
          }
        }
      },
      notification_preferences: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {
          orderUpdates: true,
          bookingNotifications: true,
          customerFeedback: true,
          marketingMessages: false
        }
      },
      whatsapp_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Added new fields
      delivery_area: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      service_radius: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      geofence_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'geofences',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding indexes
    await queryInterface.addIndex('merchants', ['user_id'], {
      unique: true,
      name: 'merchants_user_id_unique'
    });
    await queryInterface.addIndex('merchants', ['phone_number'], {
      unique: true,
      name: 'merchants_phone_number_unique'
    });
    await queryInterface.addIndex('merchants', ['geofence_id'], {
      name: 'merchants_geofence_id_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove all indexes
    await queryInterface.removeIndex('merchants', 'merchants_user_id_unique');
    await queryInterface.removeIndex('merchants', 'merchants_phone_number_unique');
    await queryInterface.removeIndex('merchants', 'merchants_geofence_id_index');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_merchants_business_type";');

    // Drop the table
    await queryInterface.dropTable('merchants');
  }
};