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
      reference: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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
    });

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
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('bookings', 'bookings_customer_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_merchant_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_reference_unique');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_booking_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status";');

    // Drop table
    await queryInterface.dropTable('bookings');
  }
};