'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductModifier extends Model {
    static associate(models) {
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'menuItem'
      });
    }
  }

  ProductModifier.init({
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
      type: DataTypes.ENUM('size', 'spiciness', 'extras', 'toppings', 'sauces', 
                          'cooking_preference', 'temperature', 'side_choices', 'dressings'),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price_adjustment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    modelName: 'ProductModifier',
    tableName: 'product_modifiers',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['menu_item_id']
      }
    ]
  });

  return ProductModifier;
};