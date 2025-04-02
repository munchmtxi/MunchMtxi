'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DriverEarnings extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      models.Driver.hasMany(this, {
        foreignKey: 'driver_id',
        as: 'earnings',
      });
    }
  }

  DriverEarnings.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      total_earned: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          isDecimal: { msg: 'Total earned must be a decimal number' },
          min: { args: [0], msg: 'Total earned cannot be negative' },
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DriverEarnings',
      tableName: 'driver_earnings',
      underscored: true,
      paranoid: true,
    }
  );

  return DriverEarnings;
};