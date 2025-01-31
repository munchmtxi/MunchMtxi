'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
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

    await queryInterface.addIndex('payments', ['order_id'], {
      name: 'payments_order_id_index'
    });
    await queryInterface.addIndex('payments', ['customer_id'], {
      name: 'payments_customer_id_index'
    });
    await queryInterface.addIndex('payments', ['merchant_id'], {
      name: 'payments_merchant_id_index'
    });
    await queryInterface.addIndex('payments', ['driver_id'], {
      name: 'payments_driver_id_index'
    });
    await queryInterface.addIndex('payments', ['transaction_id'], {
      unique: true,
      name: 'payments_transaction_id_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('payments', 'payments_order_id_index');
    await queryInterface.removeIndex('payments', 'payments_customer_id_index');
    await queryInterface.removeIndex('payments', 'payments_merchant_id_index');
    await queryInterface.removeIndex('payments', 'payments_driver_id_index');
    await queryInterface.removeIndex('payments', 'payments_transaction_id_unique');

    // Drop ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status";');

    // Drop table
    await queryInterface.dropTable('payments');
  }
};