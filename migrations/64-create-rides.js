'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rides', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      pickup_location: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      dropoff_location: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      ride_type: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'STANDARD',
      },
      status: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      scheduled_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      route_optimization_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'route_optimizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    // Add CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE rides
      ADD CONSTRAINT rides_ride_type_check
      CHECK (ride_type::text = ANY (ARRAY['STANDARD', 'PREMIUM', 'FREE', 'XL', 'ECO', 'MOTORBIKE', 'SCHEDULED']::text[]))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE rides
      ADD CONSTRAINT rides_status_check
      CHECK (status::text = ANY (ARRAY['PENDING', 'SCHEDULED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAYMENT_CONFIRMED']::text[]))
    `);

    // Add indexes
    await Promise.all([
      queryInterface.addIndex('rides', ['customer_id'], { name: 'rides_customer_id_idx' }),
      queryInterface.addIndex('rides', ['driver_id'], { name: 'rides_driver_id_idx' }),
      queryInterface.addIndex('rides', ['payment_id'], { name: 'rides_payment_id_idx' }),
      queryInterface.addIndex('rides', ['route_optimization_id'], { name: 'rides_route_optimization_id_idx' }),
      queryInterface.addIndex('rides', ['status'], { name: 'rides_status_idx' }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rides');
  },
};