// src/models/branchInsights.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchInsights extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
    }
  }

  BranchInsights.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
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
    period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        hasRequiredFields(value) {
          const required = ['revenue', 'orders', 'averageOrderValue', 'customerRetention'];
          const missing = required.filter(field => !(field in value));
          if (missing.length > 0) {
            throw new Error(`Missing required metrics: ${missing.join(', ')}`);
          }
        }
      }
    },
    customer_sentiment: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        positive: 0,
        neutral: 0,
        negative: 0
      }
    },
    performance_scores: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        overall: 0,
        service: 0,
        quality: 0,
        timeliness: 0
      }
    },
    order_routing_stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        total_routed: 0,
        successfully_delivered: 0,
        average_routing_time: 0
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
    modelName: 'BranchInsights',
    tableName: 'branch_insights',
    underscored: true,
    indexes: [
      {
        fields: ['merchant_id', 'branch_id', 'period_start', 'period_end'],
        unique: true
      },
      {
        fields: ['merchant_id']
      },
      {
        fields: ['branch_id']
      }
    ]
  });

  return BranchInsights;
};