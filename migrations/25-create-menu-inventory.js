'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('menu_inventories', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'merchant_branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      availability_status: {
        type: Sequelize.ENUM('in-stock', 'out-of-stock', 'pre-order'),
        allowNull: false,
        defaultValue: 'in-stock',
      },
      measurement_unit: {
        type: Sequelize.ENUM('piece', 'kg', 'gram', 'liter', 'ml', 'pack', 'dozen', 'bottle', 'box'),
        allowNull: false,
        defaultValue: 'piece',
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      minimum_stock_level: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      thumbnail_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      preparation_time_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      nutritional_info: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: [],
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_taxable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    // Add unique index for SKU
    await queryInterface.addIndex('menu_inventories', {
      fields: ['sku'],
      unique: true,
      where: {
        deleted_at: null,
      },
      name: 'menu_inventories_sku_unique',
    });

    // Add index for merchant_id
    await queryInterface.addIndex('menu_inventories', {
      fields: ['merchant_id'],
      name: 'menu_inventories_merchant_id_index',
    });

    // Add index for branch_id
    await queryInterface.addIndex('menu_inventories', {
      fields: ['branch_id'],
      name: 'menu_inventories_branch_id_index',
    });

    // Add index for category_id
    await queryInterface.addIndex('menu_inventories', {
      fields: ['category_id'],
      name: 'menu_inventories_category_id_index',
    });

    // Add index for availability_status
    await queryInterface.addIndex('menu_inventories', {
      fields: ['availability_status'],
      name: 'menu_inventories_availability_status_index',
    });

    // Add index for is_published
    await queryInterface.addIndex('menu_inventories', {
      fields: ['is_published'],
      name: 'menu_inventories_is_published_index',
    });

    // Add index for is_featured
    await queryInterface.addIndex('menu_inventories', {
      fields: ['is_featured'],
      name: 'menu_inventories_is_featured_index',
    });

    // Add index for created_at
    await queryInterface.addIndex('menu_inventories', {
      fields: ['created_at'],
      name: 'menu_inventories_created_at_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the menu_inventories table if the migration is rolled back
    await queryInterface.dropTable('menu_inventories');
  },
};