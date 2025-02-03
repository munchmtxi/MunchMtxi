'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'unpaid'
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MWK'
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
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('orders', ['customer_id'], {
      indicesType: Sequelize.BIGINT,
      name: 'orders_customer_id_index'
    });

    await queryInterface.addIndex('orders', ['merchant_id'], {
      indicesType: Sequelize.BIGINT,
      name: 'orders_merchant_id_index'
    });

    await queryInterface.addIndex('orders', ['driver_id'], {
      indicesType: Sequelize.BIGINT,
      name: 'orders_driver_id_index'
    });

    await queryInterface.addIndex('orders', ['order_number'], {
      indicesType: Sequelize.UNIQUE,
      name: 'orders_order_number_unique'
    });

    await queryInterface.addIndex('orders', ['currency'], {
      indicesType: Sequelize.BIGINT,
      name: 'orders_currency_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orders');
  }
};