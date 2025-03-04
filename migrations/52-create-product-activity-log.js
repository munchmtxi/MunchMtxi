'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      merchantBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      actorId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      actorType: {
        type: Sequelize.ENUM('merchant', 'staff', 'customer', 'system', 'admin'),
        allowNull: false,
      },
      actionType: {
        type: Sequelize.ENUM(
          'created', 'updated', 'deleted', 'price_changed', 'description_updated', 
          'stock_adjusted', 'added_to_cart', 'viewed', 'reviewed', 'rollback'
        ),
        allowNull: false,
      },
      previousState: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      newState: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('product_activity_logs', ['productId'], { name: 'product_activity_logs_product_id_index' });
    await queryInterface.addIndex('product_activity_logs', ['merchantBranchId'], { name: 'product_activity_logs_merchant_branch_id_index' });
    await queryInterface.addIndex('product_activity_logs', ['actorId', 'actorType'], { name: 'product_activity_logs_actor_index' });
    await queryInterface.addIndex('product_activity_logs', ['actionType'], { name: 'product_activity_logs_action_type_index' });
    await queryInterface.addIndex('product_activity_logs', ['timestamp'], { name: 'product_activity_logs_timestamp_index' });
    await queryInterface.addIndex('product_activity_logs', ['version'], { name: 'product_activity_logs_version_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_activity_logs');
  },
};