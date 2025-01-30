const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationLog extends Model {
    static associate(models) {
      NotificationLog.belongsTo(models.Notification, {
        foreignKey: 'notificationId',
        as: 'notification'
      });
    }
  }

  NotificationLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('WHATSAPP', 'WHATSAPP_CUSTOM'),
      allowNull: false
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'templates',
        key: 'id'
      }
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
    messageId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'NotificationLog',
    tableName: 'notification_logs',
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['recipient']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return NotificationLog;
};