'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('feedback', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      customer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      staff_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'staff', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      order_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      in_dining_order_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'in_dining_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      booking_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'bookings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      rating: { type: Sequelize.INTEGER, allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      is_positive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('feedback');
  },
};