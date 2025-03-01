'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionRule extends Model {
    static associate(models) {
      this.belongsTo(models.ProductPromotion, {
        foreignKey: 'promotion_id',
        as: 'promotion'
      });
    }
  }

  PromotionRule.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'product_promotions',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    rule_type: {
      type: DataTypes.ENUM('product_quantity', 'category', 'customer_type', 'time_based', 'loyalty_points'),
      allowNull: false
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON structure with specific conditions based on rule_type'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
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
    modelName: 'PromotionRule',
    tableName: 'promotion_rules',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['promotion_id']
      },
      {
        fields: ['rule_type']
      }
    ]
  });

  return PromotionRule;
};