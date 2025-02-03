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
      notification_id: {
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
        type: Sequelize.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM', 'EMAIL'),
        allowNull: false
      },
      recipient: {
        type: Sequelize.STRING,
        allowNull: false
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      templateName: {
        type: Sequelize.STRING,
        allowNull: true
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
      message_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding indexes for optimized query performance
    await queryInterface.addIndex('notification_logs', ['message_id'], {
      name: 'notification_logs_message_id'
    });
    await queryInterface.addIndex('notification_logs', ['recipient'], {
      name: 'notification_logs_recipient'
    });
    await queryInterface.addIndex('notification_logs', ['status'], {
      name: 'notification_logs_status'
    });
    await queryInterface.addIndex('notification_logs', ['created_at'], {
      name: 'notification_logs_created_at'
    });
    await queryInterface.addIndex('notification_logs', ['templateName'], {
      name: 'notification_logs_template_name'
    });
  },
  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('notification_logs', 'notification_logs_message_id');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_recipient');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_status');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_created_at');
    await queryInterface.removeIndex('notification_logs', 'notification_logs_template_name');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notification_logs_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notification_logs_status";');

    // Drop the table
    await queryInterface.dropTable('notification_logs');
  }
};