'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create order status ENUM type
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_status') THEN
          CREATE TYPE enum_orders_status AS ENUM (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'out_for_delivery',
            'completed',
            'cancelled'
          );
        END IF;
      END $$;
    `);
    
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_payment_status') THEN
          CREATE TYPE enum_orders_payment_status AS ENUM (
            'unpaid',
            'paid',
            'refunded'
          );
        END IF;
      END $$;
    `);
    

    await queryInterface.createTable('orders', {
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
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          min: 0
        }
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      estimated_arrival: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: 'enum_orders_status',
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_status: {
        type: 'enum_orders_payment_status',
        allowNull: false,
        defaultValue: 'unpaid'
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MWK'
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'routes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      optimized_route_position: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      estimated_delivery_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_delivery_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivery_distance: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('orders', ['customer_id'], {
      name: 'orders_customer_id_index'
    });

    await queryInterface.addIndex('orders', ['merchant_id'], {
      name: 'orders_merchant_id_index'
    });

    await queryInterface.addIndex('orders', ['driver_id'], {
      name: 'orders_driver_id_index'
    });

    await queryInterface.addIndex('orders', ['order_number'], {
      name: 'orders_order_number_unique',
      unique: true
    });

    await queryInterface.addIndex('orders', ['currency'], {
      name: 'orders_currency_index'
    });

    await queryInterface.addIndex('orders', ['route_id'], {
      name: 'orders_route_id_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('orders', 'orders_customer_id_index');
    await queryInterface.removeIndex('orders', 'orders_merchant_id_index');
    await queryInterface.removeIndex('orders', 'orders_driver_id_index');
    await queryInterface.removeIndex('orders', 'orders_order_number_unique');
    await queryInterface.removeIndex('orders', 'orders_currency_index');
    await queryInterface.removeIndex('orders', 'orders_route_id_index');

    // Drop the table
    await queryInterface.dropTable('orders');

    // Drop the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_orders_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_orders_payment_status;');
  }
};