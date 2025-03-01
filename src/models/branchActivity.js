// branchActivity.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchActivity extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
      
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  BranchActivity.init({
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    activity_type: {
      type: DataTypes.ENUM(
        'profile_update',
        'hours_update',
        'location_update',
        'media_update',
        'settings_update',
        'payment_update',
        'staff_update'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'BranchActivity',
    tableName: 'branch_activities',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['branch_id', 'created_at']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  return BranchActivity;
};