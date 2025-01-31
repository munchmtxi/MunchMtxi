'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      this.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
      });
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
    }
  }

  Payment.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Order ID is required' },
        isInt: { msg: 'Order ID must be an integer' },
      },
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
        isInt: { msg: 'Customer ID must be an integer' },
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
        isInt: { msg: 'Merchant ID must be an integer' },
      },
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: {
        isInt: { msg: 'Driver ID must be an integer' },
      },
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Amount must be positive',
        },
      },
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Payment method is required' },
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
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
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['order_id'],
        name: 'payments_order_id_index'
      },
      {
        fields: ['customer_id'],
        name: 'payments_customer_id_index'
      },
      {
        fields: ['merchant_id'],
        name: 'payments_merchant_id_index'
      },
      {
        fields: ['driver_id'],
        name: 'payments_driver_id_index'
      },
      {
        unique: true,
        fields: ['transaction_id'],
        name: 'payments_transaction_id_unique'
      }
    ]
  });

  return Payment;
};