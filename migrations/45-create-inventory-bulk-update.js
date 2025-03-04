'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_bulk_updates', {
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
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_type: {
        type: Sequelize.ENUM('csv', 'excel', 'json', 'manual'),
        allowNull: true,
      },
      total_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successful_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      error_details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      summary: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('inventory_bulk_updates', ['merchant_id'], { name: 'inventory_bulk_updates_merchant_id_index' });
    await queryInterface.addIndex('inventory_bulk_updates', ['branch_id'], { name: 'inventory_bulk_updates_branch_id_index' });
    await queryInterface.addIndex('inventory_bulk_updates', ['performed_by'], { name: 'inventory_bulk_updates_performed_by_index' });
    await queryInterface.addIndex('inventory_bulk_updates', ['created_at'], { name: 'inventory_bulk_updates_created_at_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_bulk_updates');
  },
};