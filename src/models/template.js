const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Template extends Model {
    static associate(models) {
      // Notification association
      Template.hasMany(models.Notification, {
        foreignKey: 'templateId',
        as: 'notifications'
      });

      // Merchant association
      Template.belongsTo(models.Merchant, {
        foreignKey: 'merchantId',
        as: 'merchant'
      });
    }
  }

  Template.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('WHATSAPP', 'SMS', 'EMAIL'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED'),
      defaultValue: 'ACTIVE'
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en'
    },
    merchantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Merchants',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Template',
    tableName: 'templates',
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['type', 'status']
      },
      {
        fields: ['merchantId']
      }
    ]
  });

  return Template;
};