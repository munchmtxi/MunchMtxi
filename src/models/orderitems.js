'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderItems extends Model {
    static associate(models) {
      // No need to define associations here as this is a junction table
      // The associations are defined in Order and MenuInventory models
    }
  }

  OrderItems.init({
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'orders',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'menu_inventories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: 'Quantity must be at least 1'
        }
      }
    },
    customization: {
      type: DataTypes.JSON,
      allowNull: true,
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
    modelName: 'OrderItems',
    tableName: 'order_items',
    underscored: true,
    timestamps: true,
    // No paranoid here as it's a junction table
    indexes: [
      {
        fields: ['order_id'],
        name: 'order_items_order_id_index'
      },
      {
        fields: ['menu_item_id'],
        name: 'order_items_menu_item_id_index'
      }
    ]
  });

  return OrderItems;
};