'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create availability status ENUM type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_drivers_availability_status AS ENUM (
        'available',
        'unavailable'
      );
    `);

    await queryInterface.createTable('drivers', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Name is required' },
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
      vehicle_info: {
        type: Sequelize.JSON,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Vehicle information is required' },
        }
      },
      license_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'License number is required' },
        }
      },
      routes: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      availability_status: {
        type: 'enum_drivers_availability_status',
        allowNull: false,
        defaultValue: 'available',
      },
      current_location: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      last_location_update: {
        type: Sequelize.DATE,
        allowNull: true
      },
      active_route_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'routes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      service_area: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      preferred_zones: {
        type: Sequelize.JSONB,
        allowNull: true
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

    // Add indexes
    await queryInterface.addIndex('drivers', ['user_id'], {
      unique: true,
      name: 'drivers_user_id_unique'
    });

    await queryInterface.addIndex('drivers', ['phone_number'], {
      unique: true,
      name: 'drivers_phone_number_unique'
    });

    await queryInterface.addIndex('drivers', ['license_number'], {
      unique: true,
      name: 'drivers_license_number_unique'
    });

    await queryInterface.addIndex('drivers', ['active_route_id'], {
      name: 'drivers_active_route_id_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('drivers', 'drivers_user_id_unique');
    await queryInterface.removeIndex('drivers', 'drivers_phone_number_unique');
    await queryInterface.removeIndex('drivers', 'drivers_license_number_unique');
    await queryInterface.removeIndex('drivers', 'drivers_active_route_id_index');

    // Drop the table
    await queryInterface.dropTable('drivers');

    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_drivers_availability_status;');
  }
};