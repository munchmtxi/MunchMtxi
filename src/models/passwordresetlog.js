'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordResetLog extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  PasswordResetLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Nullable because logs may exist for failed attempts without a user
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: DataTypes.ENUM('success', 'failed'),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Status is required' },
          isIn: {
            args: [['success', 'failed']],
            msg: 'Status must be either success or failed',
          },
        },
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'IP address is required' },
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'PasswordResetLog',
      tableName: 'password_reset_logs',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: [], // No sensitive fields to exclude here
        },
      },
      indexes: [
        {
          unique: false,
          fields: ['user_id'],
        },
        {
          unique: false,
          fields: ['status'],
        },
      ],
    }
  );

  return PasswordResetLog;
};