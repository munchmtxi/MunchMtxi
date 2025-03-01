// branchMetrics.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchMetrics extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }
  }

  BranchMetrics.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    metric_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    total_orders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_revenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    average_order_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    new_customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    repeat_customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    profile_views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    customer_ratings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        total_ratings: 0,
        average_rating: 0,
        rating_distribution: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0
        }
      }
    },
    peak_hours: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    // New fields added for enhanced performance metrics
    customer_sentiment_metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        positive_reviews: 0,
        neutral_reviews: 0,
        negative_reviews: 0,
        average_rating: 0
      }
    },
    routing_efficiency_metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        orders_received: 0,
        orders_routed_away: 0,
        orders_routed_in: 0,
        successful_deliveries: 0
      }
    },
    real_time_performance: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        current_load: 0,
        preparation_times: [],
        delivery_times: [],
        stock_levels: {}
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'BranchMetrics',
    tableName: 'branch_metrics',
    underscored: true,
    indexes: [
      {
        fields: ['branch_id', 'metric_date'],
        unique: true
      }
    ]
  });

  return BranchMetrics;
};
