'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create ENUM type for slot_type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_booking_time_slots_slot_type AS ENUM (
        'regular', 'special', 'holiday', 'event'
      );
    `);

    // Create the booking_time_slots table
    await queryInterface.createTable('booking_time_slots', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 6,
        },
        comment: '0=Sunday, 1=Monday, etc.',
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      slot_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Optional name like "Lunch", "Dinner", etc.',
      },
      max_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Maximum total capacity for this time slot',
      },
      booking_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15,
        comment: 'Booking interval in minutes (e.g., every 15 minutes)',
      },
      max_party_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: 'Maximum party size allowed for this time slot',
      },
      min_party_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Minimum party size required for this time slot',
      },
      max_advance_booking_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'How many days in advance a booking can be made',
      },
      auto_assign_tables: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to automatically assign tables',
      },
      overbooking_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of bookings allowed beyond capacity (for waitlist)',
      },
      slot_type: {
        type: 'enum_booking_time_slots_slot_type',
        allowNull: false,
        defaultValue: 'regular',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Add indexes
    await queryInterface.addIndex('booking_time_slots', ['branch_id'], { name: 'booking_time_slots_branch_id_index' });
    await queryInterface.addIndex('booking_time_slots', ['day_of_week'], { name: 'booking_time_slots_day_of_week_index' });
    await queryInterface.addIndex('booking_time_slots', ['is_active'], { name: 'booking_time_slots_is_active_index' });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the table
    await queryInterface.dropTable('booking_time_slots');

    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_booking_time_slots_slot_type;');
  },
};