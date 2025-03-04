'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize;

    await queryInterface.createTable('product_promotions', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM(
          'percentage',
          'fixed_amount',
          'buy_x_get_y',
          'bundle',
          'loyalty',
          'flash_sale'
        ),
        allowNull: false,
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true, // Can be null for buy_x_get_y promotions
      },
      code: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      min_purchase_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      usage_limit: {
        type: Sequelize.INTEGER,
        allowNull: true, // Null for unlimited
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_flash_sale: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      customer_eligibility: {
        type: Sequelize.ENUM('all', 'new', 'returning', 'loyalty'),
        allowNull: false,
        defaultValue: 'all',
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

    // Add index for merchant_id
    await queryInterface.addIndex('product_promotions', {
      fields: ['merchant_id'],
      name: 'product_promotions_merchant_id_index',
    });

    // Add index for type
    await queryInterface.addIndex('product_promotions', {
      fields: ['type'],
      name: 'product_promotions_type_index',
    });

    // Add unique index for code (only if not null)
    await queryInterface.addIndex('product_promotions', {
      fields: ['code'],
      unique: true,
      where: {
        code: {
          [Op.ne]: null,
        },
      },
      name: 'product_promotions_code_unique',
    });

    // Add composite index for start_date and end_date
    await queryInterface.addIndex('product_promotions', {
      fields: ['start_date', 'end_date'],
      name: 'product_promotions_date_range_index',
    });

    // Add index for is_active
    await queryInterface.addIndex('product_promotions', {
      fields: ['is_active'],
      name: 'product_promotions_is_active_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the product_promotions table if the migration is rolled back
    await queryInterface.dropTable('product_promotions');
  },
};