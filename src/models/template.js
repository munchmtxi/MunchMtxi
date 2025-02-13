'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class Template extends Model {
    static associate(models) {
      Template.hasMany(models.Notification, {
        foreignKey: 'template_id',
        as: 'notifications'
      });
      Template.belongsTo(models.Merchant, {
        foreignKey: 'merchant_id',
        as: 'merchant'
      });
    }
  }
  Template.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('WHATSAPP', 'SMS', 'EMAIL', 'PDF'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Subject is required' },
      },
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED'),
      defaultValue: 'ACTIVE',
      allowNull: false
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en',
      allowNull: false
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'merchants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
    modelName: 'Template',
    tableName: 'templates',
    underscored: true,
    indexes: [
      {
        fields: ['name'],
        unique: true,
        name: 'templates_name_unique'
      },
      {
        fields: ['type', 'status'],
        name: 'templates_type_status'
      },
      {
        fields: ['merchant_id'],
        name: 'templates_merchant_id'
      },
      {
        fields: ['subject'],
        name: 'templates_subject'
      }
    ]
  });
  return Template;
};
