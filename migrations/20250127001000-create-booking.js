'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create booking type ENUM
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_bookings_booking_type') THEN
          CREATE TYPE enum_bookings_booking_type AS ENUM ('table', 'taxi');
        END IF;
      END $$;
    `);
    
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_bookings_status') THEN
          CREATE TYPE enum_bookings_status AS ENUM (
            'pending',
            'approved', 
            'denied',
            'seated',
            'cancelled'
          );
        END IF;
      END $$;
    `);
    

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
        type: 'enum_bookings_booking_type',
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
        type: 'enum_bookings_status',
        allowNull: false,
        defaultValue: 'pending',
      },
      pickup_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Pickup location as {lat, lng}'
      },
      dropoff_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Dropoff location as {lat, lng}'
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
    await queryInterface.addIndex('bookings', ['customer_id'], {
      name: 'bookings_customer_id_index'
    });

    await queryInterface.addIndex('bookings', ['merchant_id'], {
      name: 'bookings_merchant_id_index'
    });

    await queryInterface.addIndex('bookings', ['reference'], {
      name: 'bookings_reference_unique',
      unique: true
    });

    await queryInterface.addIndex('bookings', ['guest_count'], {
      name: 'bookings_guest_count_index'
    });

    await queryInterface.addIndex('bookings', ['special_requests'], {
      name: 'bookings_special_requests_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('bookings', 'bookings_customer_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_merchant_id_index');
    await queryInterface.removeIndex('bookings', 'bookings_reference_unique');
    await queryInterface.removeIndex('bookings', 'bookings_guest_count_index');
    await queryInterface.removeIndex('bookings', 'bookings_special_requests_index');

    // Drop the table
    await queryInterface.dropTable('bookings');

    // Drop the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_booking_type;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_status;');
  }
};