'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ride extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver',
      });
      this.belongsTo(models.Payment, {
        foreignKey: 'paymentId',
        as: 'payment',
      });
      this.belongsTo(models.RouteOptimization, {
        foreignKey: 'routeOptimizationId',
        as: 'routeOptimization',
      });
      this.hasOne(models.Route, {
        foreignKey: 'rideId',
        as: 'route', // Added Route association
      });
    }
  }

  Ride.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'customer_id',
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'driver_id',
      },
      pickupLocation: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Pickup location is required' },
        },
        field: 'pickup_location',
      },
      dropoffLocation: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Dropoff location is required' },
        },
        field: 'dropoff_location',
      },
      rideType: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'STANDARD',
        validate: {
          isIn: {
            args: [['STANDARD', 'PREMIUM', 'FREE', 'XL', 'ECO', 'MOTORBIKE', 'SCHEDULED']],
            msg: 'Ride type must be one of: STANDARD, PREMIUM, FREE, XL, ECO, MOTORBIKE, SCHEDULED',
          },
        },
        field: 'ride_type',
      },
      status: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'PENDING',
        validate: {
          isIn: {
            args: [['PENDING', 'SCHEDULED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAYMENT_CONFIRMED']],
            msg: 'Status must be one of: PENDING, SCHEDULED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED, PAYMENT_CONFIRMED',
          },
        },
        field: 'status',
      },
      scheduledTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'scheduled_time',
      },
      paymentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'payment_id',
      },
      routeOptimizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'route_optimizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'route_optimization_id',
      },
      routeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'routes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'route_id',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'Ride',
      tableName: 'rides',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['driver_id'] },
        { fields: ['payment_id'] },
        { fields: ['route_optimization_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return Ride;
};
