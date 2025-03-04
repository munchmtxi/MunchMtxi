'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_discounts', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
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
      type: {
        type: Sequelize.ENUM(
          'percentage',
          'flat',
          'bogo',
          'seasonal',
          'loyalty',
          'bulk_discount',
          'early_bird',
          'clearance'
        ),
        allowNull: false,
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      min_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      min_order_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      customer_type: {
        type: Sequelize.ENUM('all', 'new', 'returning', 'loyalty'),
        allowNull: false,
        defaultValue: 'all',
      },
      coupon_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    });

    // Add index for menu_item_id
    await queryInterface.addIndex('product_discounts', {
      fields: ['menu_item_id'],
      name: 'product_discounts_menu_item_id_index',
    });

    // Add index for merchant_id
    await queryInterface.addIndex('product_discounts', {
      fields: ['merchant_id'],
      name: 'product_discounts_merchant_id_index',
    });

    // Add index for type
    await queryInterface.addIndex('product_discounts', {
      fields: ['type'],
      name: 'product_discounts_type_index',
    });

    // Add composite index for start_date and end_date
    await queryInterface.addIndex('product_discounts', {
      fields: ['start_date', 'end_date'],
      name: 'product_discounts_date_range_index',
    });

    // Add index for is_active
    await queryInterface.addIndex('product_discounts', {
      fields: ['is_active'],
      name: 'product_discounts_is_active_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_discounts');
  },
};