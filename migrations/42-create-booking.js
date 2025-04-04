'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    // Helper function to create ENUM type only if it does not exist
    const createEnumTypeIfNotExists = async (typeName, values) => {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
            CREATE TYPE ${typeName} AS ENUM (${values.map((v) => `'${v}'`).join(', ')});
          END IF;
        END
        $$;
      `);
    };

    // Create ENUM types if they do not exist
    await createEnumTypeIfNotExists('enum_bookings_notification_status', [
      'not_sent',
      'sent',
      'failed',
      'received',
      'confirmed',
    ]);

    await createEnumTypeIfNotExists('enum_bookings_booking_type', ['table', 'taxi']);

    await createEnumTypeIfNotExists('enum_bookings_status', [
      'pending',
      'approved',
      'denied',
      'seated',
      'cancelled',
    ]);

    await createEnumTypeIfNotExists('enum_bookings_seating_preference', [
      'no_preference',
      'indoor',
      'outdoor',
      'rooftop',
      'balcony',
      'window',
      'booth',
      'high_top',
      'bar',
      'lounge',
      'private',
    ]);

    await createEnumTypeIfNotExists('enum_bookings_source', [
      'app',
      'website',
      'phone',
      'walk_in',
      'third_party',
      'staff',
    ]);

    // Create the bookings table
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
        type: 'enum_bookings_booking_type',
        allowNull: false,
      },
      guest_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
        type: 'enum_bookings_status',
        allowNull: false,
        defaultValue: 'pending',
      },
      // New additional field for staff assignment
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      table_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tables',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      waitlist_position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      waitlisted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approval_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notification_status: {
        type: 'enum_bookings_notification_status',
        allowNull: false,
        defaultValue: 'not_sent',
      },
      last_notification_sent: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimated_arrival: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      arrived_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      seated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      departed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      seating_preference: {
        type: 'enum_bookings_seating_preference',
        allowNull: false,
        defaultValue: 'no_preference',
      },
      party_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      check_in_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      source: {
        type: 'enum_bookings_source',
        allowNull: false,
        defaultValue: 'app',
      },
      occasion: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      booking_modified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      booking_modified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      booking_metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      pickup_location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      dropoff_location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      estimated_distance: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
    await queryInterface.addIndex('bookings', ['customer_id'], { name: 'bookings_customer_id_index' });
    await queryInterface.addIndex('bookings', ['merchant_id'], { name: 'bookings_merchant_id_index' });
    await queryInterface.addIndex('bookings', ['reference'], { name: 'bookings_reference_unique', unique: true });
    await queryInterface.addIndex('bookings', ['guest_count'], { name: 'bookings_guest_count_index' });
    await queryInterface.addIndex('bookings', ['special_requests'], { name: 'bookings_special_requests_index' });
    await queryInterface.addIndex('bookings', ['branch_id'], { name: 'bookings_branch_id_index' });
    await queryInterface.addIndex('bookings', ['table_id'], { name: 'bookings_table_id_index' });
    await queryInterface.addIndex('bookings', ['status'], { name: 'bookings_status_index' });
    await queryInterface.addIndex('bookings', ['notification_status'], { name: 'bookings_notification_status_index' });
    await queryInterface.addIndex('bookings', ['booking_type'], { name: 'bookings_booking_type_index' });
    await queryInterface.addIndex('bookings', ['booking_date'], { name: 'bookings_booking_date_index' });
    await queryInterface.addIndex('bookings', ['booking_time'], { name: 'bookings_booking_time_index' });
    await queryInterface.addIndex('bookings', ['source'], { name: 'bookings_source_index' });
    await queryInterface.addIndex('bookings', ['check_in_code'], { name: 'bookings_check_in_code_index' });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the bookings table
    await queryInterface.dropTable('bookings');

    // Drop the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_notification_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_booking_type;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_seating_preference;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_source;');
  },
};
