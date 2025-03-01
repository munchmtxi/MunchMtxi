'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductAttribute extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'menuItem'
      });
    }
  }

  ProductAttribute.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'menu_inventories',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 
                          'organic', 'locally_sourced', 'allergen_free', 'non_gmo', 
                          'sustainable', 'fair_trade', 'low_calorie'),
      allowNull: false
    },
    value: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'ProductAttribute',
    tableName: 'product_attributes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['menu_item_id']
      }
    ]
  });

  return ProductAttribute;
};