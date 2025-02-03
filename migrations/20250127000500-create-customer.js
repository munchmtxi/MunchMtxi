'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
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
    await queryInterface.addIndex('customers', ['user_id'], {
      unique: true,
      name: 'customers_user_id_unique'
    });
    await queryInterface.addIndex('customers', ['phone_number'], {
      unique: true,
      name: 'customers_phone_number_unique'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove unique indexes
    await queryInterface.removeIndex('customers', 'customers_user_id_unique');
    await queryInterface.removeIndex('customers', 'customers_phone_number_unique');

    // Drop the table
    await queryInterface.dropTable('customers');
  }
};