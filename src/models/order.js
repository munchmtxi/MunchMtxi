'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      if (models.Customer) {
        this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      }
      if (models.Merchant) {
        this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      }
      if (models.MerchantBranch) {
        this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      }
      if (models.Driver) {
        this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      }
      if (models.Subscription) {
        this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
      }
      if (models.Payment) {
        this.hasMany(models.Payment, { foreignKey: 'order_id', as: 'payments' });
      }
      if (models.Notification) {
        this.hasMany(models.Notification, { foreignKey: 'order_id', as: 'notifications' });
      }
      if (models.MenuInventory && models.OrderItems) {
        this.belongsToMany(models.MenuInventory, {
          through: models.OrderItems,
          foreignKey: 'order_id',
          otherKey: 'menu_item_id',
          as: 'orderedItems',
        });
      }
      if (models.Route) {
        this.belongsTo(models.Route, { foreignKey: 'route_id', as: 'route' });
      }
      if (models.PromotionRedemption) {
        this.hasMany(models.PromotionRedemption, { foreignKey: 'order_id', as: 'promotionRedemptions' });
      }
      // New association for staff assignment
      if (models.Staff) {
        this.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
      }
    }

    get_whatsapp_template_for_status() {
      const templateMap = {
        'confirmed': 'order_confirmed',
        'preparing': 'order_preparing',
        'ready': 'order_ready',
        'out_for_delivery': 'order_out_for_delivery',
        'completed': 'order_delivered',
        'cancelled': 'order_cancelled',
      };
      return templateMap[this.status];
    }

    formatDate() { return this.created_at.toLocaleDateString(); }
    formatTime() { return this.created_at.toLocaleTimeString(); }
    formatItems() { return JSON.stringify(this.items); }
    formatTotal() { return `${this.currency} ${this.total_amount.toFixed(2)}`; }
  }

  Order.init({
    id: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      autoIncrement: true, 
      primaryKey: true 
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: { notNull: { msg: 'Customer ID is required' }, isInt: { msg: 'Customer ID must be an integer' } },
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'merchants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: { notNull: { msg: 'Merchant ID is required' }, isInt: { msg: 'Merchant ID must be an integer' } },
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'merchant_branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'drivers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      validate: { isInt: { msg: 'Driver ID must be an integer' } },
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'subscriptions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    items: { 
      type: DataTypes.JSON, 
      allowNull: false, 
      validate: { notEmpty: { msg: 'Items are required' } } 
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: { args: [0], msg: 'Total amount must be positive' } },
    },
    order_number: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    estimated_arrival: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_status: {
      type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MWK',
      validate: { notEmpty: { msg: 'Currency is required' } },
    },
    route_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    optimized_route_position: { type: DataTypes.INTEGER, allowNull: true },
    estimated_delivery_time: { type: DataTypes.DATE, allowNull: true },
    actual_delivery_time: { type: DataTypes.DATE, allowNull: true },
    delivery_distance: { type: DataTypes.DECIMAL, allowNull: true },
    // New field for staff assignment
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    applied_promotions: { 
      type: DataTypes.JSON, 
      allowNull: true, 
      comment: 'JSON array of applied promotion details' 
    },
    total_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    routing_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { original_branch_id: null, routed_branch_id: null, routing_timestamp: null, routing_reason: null, routing_metrics: { distance: null, estimated_time: null, branch_load: null } },
    },
    routing_history: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    // New field for delivery location
    delivery_location: { 
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Delivery location coordinates or address in JSONB format (e.g., { lat, lng } or { formattedAddress })',
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
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['customer_id'], name: 'orders_customer_id_index' },
      { fields: ['merchant_id'], name: 'orders_merchant_id_index' },
      { fields: ['branch_id'], name: 'orders_branch_id_index' },
      { fields: ['driver_id'], name: 'orders_driver_id_index' },
      { fields: ['subscription_id'], name: 'orders_subscription_id_index' },
      { unique: true, fields: ['order_number'], name: 'orders_order_number_unique' },
      { fields: ['currency'], name: 'orders_currency_index' },
      { fields: ['route_id'], name: 'orders_route_id_index' },
    ],
  });

  return Order;
};
