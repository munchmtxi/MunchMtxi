'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notification_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      notification_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'notifications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM', 'EMAIL'),
        allowNull: false,
      },
      recipient: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      template_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('SENT', 'FAILED', 'PERMANENTLY_FAILED'),
        allowNull: false,
      },
      message_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      next_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivery_provider: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      delivery_metadata: {
        type: Sequelize.JSON,
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

    await queryInterface.addIndex('notification_logs', ['message_id'], { name: 'notification_logs_message_id' });
    await queryInterface.addIndex('notification_logs', ['recipient'], { name: 'notification_logs_recipient' });
    await queryInterface.addIndex('notification_logs', ['status'], { name: 'notification_logs_status' });
    await queryInterface.addIndex('notification_logs', ['created_at'], { name: 'notification_logs_created_at' });
    await queryInterface.addIndex('notification_logs', ['template_name'], { name: 'notification_logs_template_name' });
    await queryInterface.addIndex('notification_logs', ['status', 'retry_count'], { name: 'notification_logs_retry_status' });
    await queryInterface.addIndex('notification_logs', ['next_retry_at'], { name: 'notification_logs_next_retry' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notification_logs');
  },
};