'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      models.Driver.hasMany(this, {
        foreignKey: 'driver_id',
        as: 'vehicles',
      });
    }
  }

  Vehicle.init(
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
      type: {
        type: DataTypes.ENUM('bicycle', 'motorbike', 'car', 'van', 'truck'),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Vehicle type is required' },
          isIn: {
            args: [['bicycle', 'motorbike', 'car', 'van', 'truck']],
            msg: 'Vehicle type must be one of bicycle, motorbike, car, van, truck',
          },
        },
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Capacity is required' },
          isInt: { msg: 'Capacity must be an integer' },
          min: { args: [1], msg: 'Capacity must be at least 1' },
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
      modelName: 'Vehicle',
      tableName: 'vehicles',
      underscored: true,
      paranoid: true,
    }
  );

  return Vehicle;
};