'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
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
        type: Sequelize.ENUM('available', 'unavailable'),
        allowNull: false,
        defaultValue: 'available',
      },
      current_location: {
        type: Sequelize.GEOMETRY('POINT'),
        allowNull: true,
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

    // Adding unique indexes
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
  },
  async down(queryInterface, Sequelize) {
    // Remove unique indexes
    await queryInterface.removeIndex('drivers', 'drivers_user_id_unique');
    await queryInterface.removeIndex('drivers', 'drivers_phone_number_unique');
    await queryInterface.removeIndex('drivers', 'drivers_license_number_unique');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_drivers_availability_status";');

    // Drop the table
    await queryInterface.dropTable('drivers');
  }
};