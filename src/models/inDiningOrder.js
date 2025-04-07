'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InDiningOrder extends Model {
    static associate(models) {
      // Link to Customer (optional but tied to Payment)
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });

      // Link to MerchantBranch (required for context and payment methods)
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch',
      });

      // Link to Table (required for in-dining)
      this.belongsTo(models.Table, {
        foreignKey: 'table_id',
        as: 'table',
      });

      // Link to OrderItems for dish details
      this.hasMany(models.OrderItems, {
        foreignKey: 'order_id',
        as: 'orderItems',
        constraints: false, // Allows referencing InDiningOrder instead of Order
      });

      // Link to MenuInventory through OrderItems
      this.belongsToMany(models.MenuInventory, {
        through: models.OrderItems,
        foreignKey: 'order_id',
        otherKey: 'menu_item_id',
        as: 'menuItems',
      });

      // Link to Payment (for payment processing)
      this.hasOne(models.Payment, {
        foreignKey: 'order_id',
        as: 'payment',
        constraints: false, // Allows referencing InDiningOrder
      });

      // Link to Notification (for status updates)
      this.hasMany(models.Notification, {
        foreignKey: 'order_id',
        as: 'notifications',
        constraints: false, // Allows referencing InDiningOrder
      });

      // Optional: Link to Staff (server assignment)
      this.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'server',
      });
    }
  }

  InDiningOrder.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Required by Payment model
      references: {
        model: 'customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Customer ID is required for payment association' },
        isInt: { msg: 'Customer ID must be an integer' },
      },
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_branches',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Branch ID is required' },
        isInt: { msg: 'Branch ID must be an integer' },
      },
    },
    table_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tables',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Table ID is required' },
        isInt: { msg: 'Table ID must be an integer' },
      },
    },
    order_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Order number is required' },
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'served', 'closed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    preparation_status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Total amount must be positive' },
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MWK',
      validate: {
        notEmpty: { msg: 'Currency is required' },
      },
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'processing', 'verified', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending', // Align with broader enum
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Optional fields
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Assigned server (optional)',
    },
    recommendation_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Stores recommendation metadata from ProductRecommendationAnalytics (optional)',
    },
    estimated_completion_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Estimated time for order completion based on MenuInventory.preparation_time_minutes (optional for Live ETA)',
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
    modelName: 'InDiningOrder',
    tableName: 'in_dining_orders',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['branch_id'] },
      { fields: ['table_id'] },
      { unique: true, fields: ['order_number'] },
      { fields: ['status'] },
      { fields: ['preparation_status'] },
      { fields: ['staff_id'] },
    ],
  });

  return InDiningOrder;
};
