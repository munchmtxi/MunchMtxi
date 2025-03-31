'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('in_dining_orders', {
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
      table_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tables',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'served', 'closed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      preparation_status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MWK',
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
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
      recommendation_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      estimated_completion_time: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('in_dining_orders', ['customer_id']);
    await queryInterface.addIndex('in_dining_orders', ['branch_id']);
    await queryInterface.addIndex('in_dining_orders', ['table_id']);
    await queryInterface.addIndex('in_dining_orders', ['order_number'], { unique: true });
    await queryInterface.addIndex('in_dining_orders', ['status']);
    await queryInterface.addIndex('in_dining_orders', ['preparation_status']);
    await queryInterface.addIndex('in_dining_orders', ['staff_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('in_dining_orders');
  }
};
