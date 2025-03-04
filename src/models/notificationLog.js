const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationLog extends Model {
    static associate(models) {
      NotificationLog.belongsTo(models.Notification, {
        foreignKey: 'notification_id',
        as: 'notification'
      });
    }
  }

  NotificationLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    notification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'notifications',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    type: {
      type: DataTypes.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM', 'EMAIL'),
      allowNull: false
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'templates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    template_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Merged status field now includes PERMANENTLY_FAILED as well.
    status: {
      type: DataTypes.ENUM('SENT', 'FAILED', 'PERMANENTLY_FAILED'),
      allowNull: false
    },
    message_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Additional fields from the first snippet:
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    next_retry_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivery_provider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    delivery_metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'NotificationLog',
    tableName: 'notification_logs',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['message_id'],
        name: 'notification_logs_message_id'
      },
      {
        fields: ['recipient'],
        name: 'notification_logs_recipient'
      },
      {
        fields: ['status'],
        name: 'notification_logs_status'
      },
      {
        fields: ['created_at'],
        name: 'notification_logs_created_at'
      },
      {
        fields: ['template_name'],
        name: 'notification_logs_template_name'
      },
      // New indexes from the first snippet:
      {
        fields: ['status', 'retry_count'],
        name: 'notification_logs_retry_status'
      },
      {
        fields: ['next_retry_at'],
        name: 'notification_logs_next_retry'
      }
    ]
  });

  return NotificationLog;
};
