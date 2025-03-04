'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_promotion_rules_rule_type AS ENUM (
        'product_quantity', 'category', 'customer_type', 'time_based', 'loyalty_points'
      );
    `);

    await queryInterface.createTable('promotion_rules', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      promotion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'product_promotions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rule_type: {
        type: 'enum_promotion_rules_rule_type',
        allowNull: false,
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
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

    await queryInterface.addIndex('promotion_rules', ['promotion_id'], { name: 'promotion_rules_promotion_id_index' });
    await queryInterface.addIndex('promotion_rules', ['rule_type'], { name: 'promotion_rules_rule_type_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('promotion_rules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_promotion_rules_rule_type;');
  },
};