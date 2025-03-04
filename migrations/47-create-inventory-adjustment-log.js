'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_adjustment_logs', {
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
      adjustment_type: {
        type: Sequelize.ENUM('add', 'subtract', 'set'),
        allowNull: false,
      },
      previous_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      new_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      adjustment_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reference_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reference_type: {
        type: Sequelize.ENUM('manual', 'order', 'bulk_update', 'import', 'system'),
        allowNull: false,
        defaultValue: 'manual',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('inventory_adjustment_logs', ['menu_item_id'], { name: 'inventory_adjustment_logs_menu_item_id_index' });
    await queryInterface.addIndex('inventory_adjustment_logs', ['merchant_id'], { name: 'inventory_adjustment_logs_merchant_id_index' });
    await queryInterface.addIndex('inventory_adjustment_logs', ['branch_id'], { name: 'inventory_adjustment_logs_branch_id_index' });
    await queryInterface.addIndex('inventory_adjustment_logs', ['performed_by'], { name: 'inventory_adjustment_logs_performed_by_index' });
    await queryInterface.addIndex('inventory_adjustment_logs', ['reference_type'], { name: 'inventory_adjustment_logs_reference_type_index' });
    await queryInterface.addIndex('inventory_adjustment_logs', ['created_at'], { name: 'inventory_adjustment_logs_created_at_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_adjustment_logs');
  },
};