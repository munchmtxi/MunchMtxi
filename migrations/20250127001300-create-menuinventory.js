'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menu_inventories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      item_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Item name is required' },
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Price must be positive',
          }
        }
      },
      stock_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Stock level cannot be negative',
          }
        }
      },
      category: {
        type: Sequelize.STRING,
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
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding index on merchant_id
    await queryInterface.addIndex('menu_inventories', ['merchant_id'], {
      name: 'menu_inventories_merchant_id_index'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove index on merchant_id
    await queryInterface.removeIndex('menu_inventories', 'menu_inventories_merchant_id_index');

    // Drop the table
    await queryInterface.dropTable('menu_inventories');
  }
};