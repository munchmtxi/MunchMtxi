// src/models/merchantPerformanceMetrics.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MerchantPerformanceMetrics extends Model {
    static associate(models) {
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
    }
  }

  MerchantPerformanceMetrics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Order Metrics
    orders_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    completed_orders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    cancelled_orders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    avg_order_value: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    
    // Revenue Metrics
    total_revenue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    net_revenue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },

    // Rating Metrics
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 5
      }
    },
    total_ratings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    rating_distribution: {
      type: DataTypes.JSONB,
      defaultValue: {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0
      },
      allowNull: false
    },

    // Time Period
    period_type: {
      type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'daily'
    },
    period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },

    // Metadata
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
    modelName: 'MerchantPerformanceMetrics',
    tableName: 'merchant_performance_metrics',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['merchant_id']
      },
      {
        fields: ['merchant_id', 'period_type', 'period_start'],
        unique: true,
        name: 'unique_merchant_period_metrics'
      },
      {
        fields: ['period_start', 'period_end']
      }
    ],
    hooks: {
      beforeValidate: async (metrics) => {
        // Ensure period_end is after period_start
        if (metrics.period_start && metrics.period_end) {
          if (metrics.period_end <= metrics.period_start) {
            throw new Error('Period end must be after period start');
          }
        }
      }
    }
  });

  // Instance Methods
  MerchantPerformanceMetrics.prototype.calculateAverageOrderValue = function() {
    if (this.orders_count === 0) return 0;
    return this.total_revenue / this.orders_count;
  };

  MerchantPerformanceMetrics.prototype.getCompletionRate = function() {
    if (this.orders_count === 0) return 0;
    return (this.completed_orders / this.orders_count) * 100;
  };

  MerchantPerformanceMetrics.prototype.getCancellationRate = function() {
    if (this.orders_count === 0) return 0;
    return (this.cancelled_orders / this.orders_count) * 100;
  };

  // Static Methods
  MerchantPerformanceMetrics.getMetricsByPeriod = async function(merchantId, periodType, startDate, endDate) {
    return await this.findAll({
      where: {
        merchant_id: merchantId,
        period_type: periodType,
        period_start: {
          [sequelize.Op.gte]: startDate
        },
        period_end: {
          [sequelize.Op.lte]: endDate
        }
      },
      order: [['period_start', 'ASC']]
    });
  };

  return MerchantPerformanceMetrics;
};