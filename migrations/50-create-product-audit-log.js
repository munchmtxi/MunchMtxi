'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_audit_logs', {
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
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('product_audit_logs', ['menu_item_id'], { name: 'product_audit_logs_menu_item_id_index' });
    await queryInterface.addIndex('product_audit_logs', ['user_id'], { name: 'product_audit_logs_user_id_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_audit_logs');
  },
};