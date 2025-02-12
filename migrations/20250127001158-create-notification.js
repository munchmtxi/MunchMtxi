'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        validate: {
          notNull: { msg: 'User ID is required' },
          isInt: { msg: 'User ID must be an integer' },
        }
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Order ID must be an integer' },
        }
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        validate: {
          isInt: { msg: 'Booking ID must be an integer' },
        }
      },
      template_id: { // New field added for template_id
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          isInt: { msg: 'Template ID must be an integer' },
        }
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Notification type is required' },
        }
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Notification message is required' },
        }
      },
      priority: {
        type: Sequelize.ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
        allowNull: false,
        defaultValue: 'LOW'
      },
      read_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      action_url: {
        type: Sequelize.STRING,
        allowNull: true, // New field for action URLs
        validate: {
          isUrl: { msg: 'Action URL must be a valid URL' },
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    }, { // Options for createTable
      timestamps: true, // Ensure timestamps are enabled
      paranoid: true,   // Enable paranoid soft-deletes
    });

    // Adding indexes
    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'notifications_user_id_index'
    });
    await queryInterface.addIndex('notifications', ['order_id'], {
      name: 'notifications_order_id_index'
    });
    await queryInterface.addIndex('notifications', ['booking_id'], {
      name: 'notifications_booking_id_index'
    });

    // Adding index on action_url for performance
    await queryInterface.addIndex('notifications', ['action_url'], {
      name: 'notifications_action_url_index'
    });

    // Adding index on template_id
    await queryInterface.addIndex('notifications', ['template_id'], {
      name: 'notifications_template_id_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('notifications', 'notifications_user_id_index');
    await queryInterface.removeIndex('notifications', 'notifications_order_id_index');
    await queryInterface.removeIndex('notifications', 'notifications_booking_id_index');
    await queryInterface.removeIndex('notifications', 'notifications_action_url_index');
    await queryInterface.removeIndex('notifications', 'notifications_template_id_index');

    // Drop the table
    await queryInterface.dropTable('notifications');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_priority";');
  }
};
