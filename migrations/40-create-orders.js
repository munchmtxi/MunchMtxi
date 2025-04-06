'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Destructure DataTypes from Sequelize for convenience
    const { DataTypes } = Sequelize;

    // Create the orders table with the new delivery_location field
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'subscriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      estimated_arrival: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MWK',
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'routes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      optimized_route_position: { type: Sequelize.INTEGER, allowNull: true },
      estimated_delivery_time: { type: Sequelize.DATE, allowNull: true },
      actual_delivery_time: { type: Sequelize.DATE, allowNull: true },
      delivery_distance: { type: Sequelize.DECIMAL, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      applied_promotions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON array of applied promotion details',
      },
      total_discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      routing_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          original_branch_id: null,
          routed_branch_id: null,
          routing_timestamp: null,
          routing_reason: null,
          routing_metrics: { distance: null, estimated_time: null, branch_load: null },
        },
      },
      routing_history: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      // New field for staff assignment
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'staff', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // New field for delivery location
      delivery_location: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Delivery location coordinates or address in JSONB format (e.g., { lat, lng } or { formattedAddress })',
      },
    });

    // Add indexes for improved performance
    await queryInterface.addIndex('orders', ['customer_id'], { name: 'orders_customer_id_index' });
    await queryInterface.addIndex('orders', ['merchant_id'], { name: 'orders_merchant_id_index' });
    await queryInterface.addIndex('orders', ['branch_id'], { name: 'orders_branch_id_index' });
    await queryInterface.addIndex('orders', ['driver_id'], { name: 'orders_driver_id_index' });
    await queryInterface.addIndex('orders', ['subscription_id'], { name: 'orders_subscription_id_index' });
    await queryInterface.addIndex('orders', ['order_number'], { name: 'orders_order_number_unique', unique: true });
    await queryInterface.addIndex('orders', ['currency'], { name: 'orders_currency_index' });
    await queryInterface.addIndex('orders', ['route_id'], { name: 'orders_route_id_index' });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the orders table (and optionally ENUM types)
    await queryInterface.dropTable('orders');
  },
};
