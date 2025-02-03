'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
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
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Driver ID must be an integer' },
        }
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Items are required' },
        }
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Total amount must be positive',
          }
        }
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Order number is required' },
        }
      },
      estimated_arrival: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MWK',
        validate: {
          notEmpty: { msg: 'Currency is required' },
        }
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
      unique: true,
      name: 'orders_order_number_unique'
    });
    await queryInterface.addIndex('orders', ['currency'], {
      name: 'orders_currency_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('orders', 'orders_customer_id_index');
    await queryInterface.removeIndex('orders', 'orders_merchant_id_index');
    await queryInterface.removeIndex('orders', 'orders_driver_id_index');
    await queryInterface.removeIndex('orders', 'orders_order_number_unique');
    await queryInterface.removeIndex('orders', 'orders_currency_index');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_status";');

    // Drop the table
    await queryInterface.dropTable('orders');
  }
};