'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customers', {
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
      address: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Address is required' },
        }
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      payment_methods: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      saved_addresses: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      default_address_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      last_known_location: {
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
    await queryInterface.addIndex('customers', ['user_id'], {
      unique: true,
      name: 'customers_user_id_unique'
    });

    await queryInterface.addIndex('customers', ['phone_number'], {
      unique: true,
      name: 'customers_phone_number_unique'
    });

    await queryInterface.addIndex('customers', ['default_address_id'], {
      name: 'customers_default_address_id_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('customers', 'customers_user_id_unique');
    await queryInterface.removeIndex('customers', 'customers_phone_number_unique');
    await queryInterface.removeIndex('customers', 'customers_default_address_id_index');

    // Drop the table
    await queryInterface.dropTable('customers');
  }
};