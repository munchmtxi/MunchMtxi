'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_product_attributes_type AS ENUM (
        'vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 
        'organic', 'locally_sourced', 'allergen_free', 'non_gmo', 
        'sustainable', 'fair_trade', 'low_calorie'
      );
    `);

    await queryInterface.createTable('product_attributes', {
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
      type: {
        type: 'enum_product_attributes_type',
        allowNull: false,
      },
      value: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('product_attributes', ['menu_item_id'], { name: 'product_attributes_menu_item_id_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_attributes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_product_attributes_type;');
  },
};