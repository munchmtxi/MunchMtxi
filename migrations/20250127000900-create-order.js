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
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
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
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'unpaid',
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
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('orders', 'orders_customer_id_index');
    await queryInterface.removeIndex('orders', 'orders_merchant_id_index');
    await queryInterface.removeIndex('orders', 'orders_driver_id_index');
    await queryInterface.removeIndex('orders', 'orders_order_number_unique');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_status";');

    // Drop table
    await queryInterface.dropTable('orders');
  }
};