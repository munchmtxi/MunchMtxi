'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      menu_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'menu_inventories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: 'Quantity must be at least 1'
          }
        }
      },
      customization: {
        type: Sequelize.JSON,
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
      }
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
    });

    // Adding indexes
    await queryInterface.addIndex('order_items', ['order_id'], {
      name: 'order_items_order_id_index'
    });
    await queryInterface.addIndex('order_items', ['menu_item_id'], {
      name: 'order_items_menu_item_id_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('order_items', 'order_items_order_id_index');
    await queryInterface.removeIndex('order_items', 'order_items_menu_item_id_index');

    // Drop the table
    await queryInterface.dropTable('order_items');
  }
};