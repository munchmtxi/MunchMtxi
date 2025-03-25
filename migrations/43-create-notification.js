'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true, // Nullable for now; set to false later with a default template
        references: { model: 'templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
        allowNull: false,
        defaultValue: 'LOW',
      },
      read_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id_index' });
    await queryInterface.addIndex('notifications', ['order_id'], { name: 'notifications_order_id_index' });
    await queryInterface.addIndex('notifications', ['booking_id'], { name: 'notifications_booking_id_index' });
    await queryInterface.addIndex('notifications', ['template_id'], { name: 'notifications_template_id_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  },
};