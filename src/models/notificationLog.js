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
      type: DataTypes.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM'),
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
    parameters: {
      type: DataTypes.JSON,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('SENT', 'FAILED'),
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
      }
    ]
  });

  return NotificationLog;
};