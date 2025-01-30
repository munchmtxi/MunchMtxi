'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      notificationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'notifications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM'),
        allowNull: false
      },
      recipient: {
        type: Sequelize.STRING,
        allowNull: false
      },
      templateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('SENT', 'FAILED'),
        allowNull: false
      },
      messageId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Creating indexes for optimized query performance
    await queryInterface.addIndex('notification_logs', ['messageId'], {
      name: 'notification_logs_message_id'
    });

    await queryInterface.addIndex('notification_logs', ['recipient'], {
      name: 'notification_logs_recipient'
    });

    await queryInterface.addIndex('notification_logs', ['status'], {
      name: 'notification_logs_status'
    });

    await queryInterface.addIndex('notification_logs', ['createdAt'], {
      name: 'notification_logs_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('notification_logs', 'notification_logs_message_id');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_recipient');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_status');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_created_at');

    // Drop the ENUM types after table deletion
    await queryInterface.dropTable('notification_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notification_logs_type;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notification_logs_status;');
  }
};