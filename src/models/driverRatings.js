'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DriverRatings extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      this.belongsTo(models.Ride, {
        foreignKey: 'ride_id',
        as: 'ride',
      });
      this.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
      });
      models.Driver.hasMany(this, {
        foreignKey: 'driver_id',
        as: 'ratings',
      });
      models.Ride.hasOne(this, {
        foreignKey: 'ride_id',
        as: 'rating',
      });
      models.Order.hasOne(this, {
        foreignKey: 'order_id',
        as: 'rating',
      });
    }
  }

  DriverRatings.init(
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
      ride_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'rides',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Rating is required' },
          isDecimal: { msg: 'Rating must be a decimal number' },
          min: { args: [1.00], msg: 'Rating must be at least 1.00' },
          max: { args: [5.00], msg: 'Rating cannot exceed 5.00' },
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
      modelName: 'DriverRatings',
      tableName: 'driver_ratings',
      underscored: true,
      paranoid: true,
    }
  );

  return DriverRatings;
};