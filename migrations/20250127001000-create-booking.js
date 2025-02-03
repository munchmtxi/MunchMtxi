'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'Customer ID is required' },
          isInt: { msg: 'Customer ID must be an integer' },
        }
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
        validate: {
          notNull: { msg: 'Merchant ID is required' },
          isInt: { msg: 'Merchant ID must be an integer' },
        }
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Reference is required' },
        }
      },
      booking_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      booking_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      booking_type: {
        type: Sequelize.ENUM('table', 'taxi'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['table', 'taxi']],
            msg: 'Booking type must be either table or taxi',
          }
        }
      },
      guest_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: { args: [1], msg: 'Guest count must be at least 1' },
        }
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'denied', 'seated', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
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
    await queryInterface.addIndex('bookings', ['customer_id'], {
      name: 'bookings_customer_id_index'
    });
    await queryInterface.addIndex('bookings', ['merchant_id'], {
      name: 'bookings_merchant_id_index'
    });
    await queryInterface.addIndex('bookings', ['reference'], {
      unique: true,
      name: 'bookings_reference_unique'
    });
    await queryInterface.addIndex('bookings', ['guest_count'], {
      name: 'bookings_guest_count_index'
    });
    await queryInterface.addIndex('bookings', ['special_requests'], {
      name: 'bookings_special_requests_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('bookings', 'bookings_customer_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_merchant_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_reference_unique');
    await queryInterface.removeIndex('bookings', 'bookings_guest_count_index');
    await queryInterface.removeIndex('bookings', 'bookings_special_requests_index');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_booking_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status";');

    // Drop the table
    await queryInterface.dropTable('bookings');
  }
};