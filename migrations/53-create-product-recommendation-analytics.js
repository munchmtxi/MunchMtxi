'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_recommendation_analytics', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'menu_inventories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      recommendation_type: {
        type: Sequelize.ENUM('trending', 'cross-sell', 'personalized', 'seasonal'),
        allowNull: false,
      },
      event_type: {
        type: Sequelize.ENUM('impression', 'click', 'add-to-cart', 'purchase'),
        allowNull: false,
      },
      source_product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'menu_inventories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      session_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      device_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
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
    });

    await queryInterface.addIndex('product_recommendation_analytics', ['merchant_id'], { name: 'product_recommendation_analytics_merchant_id_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['product_id'], { name: 'product_recommendation_analytics_product_id_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['customer_id'], { name: 'product_recommendation_analytics_customer_id_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['recommendation_type'], { name: 'product_recommendation_analytics_recommendation_type_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['event_type'], { name: 'product_recommendation_analytics_event_type_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['created_at'], { name: 'product_recommendation_analytics_created_at_index' });
    await queryInterface.addIndex('product_recommendation_analytics', ['session_id'], { name: 'product_recommendation_analytics_session_id_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_recommendation_analytics');
  },
};