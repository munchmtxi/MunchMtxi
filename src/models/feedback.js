'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
      this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      this.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
      this.belongsTo(models.InDiningOrder, { foreignKey: 'in_dining_order_id', as: 'inDiningOrder' });
      this.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    }
  }

  Feedback.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    in_dining_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'in_dining_orders', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_positive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    deleted_at: { // Added
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Feedback',
    tableName: 'feedback',
    underscored: true,
    paranoid: true, // Enable soft deletes
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['staff_id'] },
      { fields: ['order_id'] },
      { fields: ['in_dining_order_id'] },
      { fields: ['booking_id'] },
    ],
  });

  return Feedback;
};