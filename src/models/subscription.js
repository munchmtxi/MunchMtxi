'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.MenuInventory, {
        foreignKey: 'menu_item_id',
        as: 'menuItem',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.hasMany(models.Order, {
        foreignKey: 'subscription_id', // Assumes Order model will be updated to include this
        as: 'orders',
      });
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Customer ID is required' },
      },
    },
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'menu_inventories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Menu item ID is required' },
      },
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Merchant ID is required' },
      },
    },
    schedule: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      validate: {
        notNull: { msg: 'Schedule is required' },
        isIn: {
          args: [['daily', 'weekly', 'monthly']],
          msg: 'Invalid schedule type',
        },
      },
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'Start date must be a valid date' },
      },
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'End date must be a valid date' },
        isAfterStart(value) {
          if (value && new Date(value) <= new Date(this.start_date)) {
            throw new Error('End date must be after start date');
          }
        },
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'canceled'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        notNull: { msg: 'Status is required' },
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Total amount must be positive' },
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['menu_item_id'] },
      { fields: ['merchant_id'] },
      { fields: ['status'] },
      { fields: ['start_date', 'end_date'] },
    ],
    hooks: {
      beforeValidate: (subscription) => {
        if (subscription.end_date && new Date(subscription.end_date) <= new Date(subscription.start_date)) {
          throw new Error('End date must be after start date');
        }
      },
    },
  });

  return Subscription;
};