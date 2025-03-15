'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordHistory extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  PasswordHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'merchant',
        validate: {
          isIn: {
            args: [['merchant', 'customer', 'staff', 'driver']],
            msg: 'User type must be merchant, customer, staff, or driver',
          },
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password hash is required' },
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: { // Added
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PasswordHistory',
      tableName: 'password_histories',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: ['password_hash'],
        },
      },
      indexes: [
        {
          unique: false,
          fields: ['user_id'],
        },
      ],
    }
  );

  return PasswordHistory;
};