'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('promotion_redemptions', {
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
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      promotion_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('promotion_redemptions', ['promotion_id'], { name: 'promotion_redemptions_promotion_id_index' });
    await queryInterface.addIndex('promotion_redemptions', ['order_id'], { name: 'promotion_redemptions_order_id_index' });
    await queryInterface.addIndex('promotion_redemptions', ['customer_id'], { name: 'promotion_redemptions_customer_id_index' });
    await queryInterface.addIndex('promotion_redemptions', ['redeemed_at'], { name: 'promotion_redemptions_redeemed_at_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('promotion_redemptions');
  },
};