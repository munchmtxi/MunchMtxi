'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchant_performance_metrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      // Order Metrics
      orders_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      completed_orders: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      cancelled_orders: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      avg_order_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      // Revenue Metrics
      total_revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      net_revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      refund_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      // Rating Metrics
      average_rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
        allowNull: false,
      },
      total_ratings: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      rating_distribution: {
        type: Sequelize.JSONB,
        defaultValue: {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
        },
        allowNull: false,
      },
      // Time Period
      period_type: {
        type: Sequelize.ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'daily',
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      // Metadata
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
    await queryInterface.addIndex('merchant_performance_metrics', {
      fields: ['merchant_id'],
      name: 'idx_merchant_performance_merchant_id',
    });

    // Add unique composite index for merchant_id, period_type, and period_start
    await queryInterface.addIndex('merchant_performance_metrics', {
      fields: ['merchant_id', 'period_type', 'period_start'],
      unique: true,
      name: 'unique_merchant_period_metrics',
    });

    // Add index for period_start and period_end
    await queryInterface.addIndex('merchant_performance_metrics', {
      fields: ['period_start', 'period_end'],
      name: 'idx_merchant_performance_period_range',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the merchant_performance_metrics table if the migration is rolled back
    await queryInterface.dropTable('merchant_performance_metrics');
  },
};