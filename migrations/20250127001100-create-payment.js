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
        validate: {
          notNull: { msg: 'Order ID is required' },
          isInt: { msg: 'Order ID must be an integer' },
        }
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
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Amount must be positive',
          },
        }
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Payment method is required' },
        }
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
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding indexes
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

    // Drop the table
    await queryInterface.dropTable('payments');
  }
};