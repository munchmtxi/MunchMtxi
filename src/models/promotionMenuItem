'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionMenuItem extends Model {
    static associate(models) {
      // Associations defined in the main models
    }
  }

  PromotionMenuItem.init({
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'product_promotions',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'menu_inventories',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
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
    modelName: 'PromotionMenuItem',
    tableName: 'promotion_menu_items',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['promotion_id']
      },
      {
        fields: ['menu_item_id']
      }
    ]
  });

  return PromotionMenuItem;
};