'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
      });
      this.belongsTo(models.Booking, {
        foreignKey: 'booking_id',
        as: 'booking',
      });
    }
  }

  Notification.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' },
      },
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: {
        isInt: { msg: 'Order ID must be an integer' },
      },
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bookings',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: {
        isInt: { msg: 'Booking ID must be an integer' },
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Notification type is required' },
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Notification message is required' },
      },
    },
    read_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    modelName: 'Notification',
    tableName: 'notifications',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'notifications_user_id_index'
      },
      {
        fields: ['order_id'],
        name: 'notifications_order_id_index'
      },
      {
        fields: ['booking_id'],
        name: 'notifications_booking_id_index'
      }
    ]
  });

  return Notification;
};