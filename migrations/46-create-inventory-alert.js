'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_alerts', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      menu_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'menu_inventories', key: 'id' },
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
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('low_stock', 'out_of_stock', 'over_stock', 'expiring'),
        allowNull: false,
        defaultValue: 'low_stock',
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      resolved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resolved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resolved_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('inventory_alerts', ['menu_item_id'], { name: 'inventory_alerts_menu_item_id_index' });
    await queryInterface.addIndex('inventory_alerts', ['merchant_id'], { name: 'inventory_alerts_merchant_id_index' });
    await queryInterface.addIndex('inventory_alerts', ['branch_id'], { name: 'inventory_alerts_branch_id_index' });
    await queryInterface.addIndex('inventory_alerts', ['type'], { name: 'inventory_alerts_type_index' });
    await queryInterface.addIndex('inventory_alerts', ['resolved'], { name: 'inventory_alerts_resolved_index' });
    await queryInterface.addIndex('inventory_alerts', ['created_at'], { name: 'inventory_alerts_created_at_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_alerts');
  },
};