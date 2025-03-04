'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('branch_metrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      metric_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      total_orders: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      total_revenue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      average_order_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      total_customers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      new_customers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      repeat_customers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      profile_views: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      customer_ratings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          total_ratings: 0,
          average_rating: 0,
          rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        },
      },
      peak_hours: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      customer_sentiment_metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          positive_reviews: 0,
          neutral_reviews: 0,
          negative_reviews: 0,
          average_rating: 0,
        },
      },
      routing_efficiency_metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          orders_received: 0,
          orders_routed_away: 0,
          orders_routed_in: 0,
          successful_deliveries: 0,
        },
      },
      real_time_performance: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          current_load: 0,
          preparation_times: [],
          delivery_times: [],
          stock_levels: {},
        },
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

    // Add unique index for branch_id and metric_date
    await queryInterface.addIndex('branch_metrics', {
      fields: ['branch_id', 'metric_date'],
      unique: true,
      name: 'branch_metrics_unique_branch_metric_date',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('branch_metrics');
  },
};