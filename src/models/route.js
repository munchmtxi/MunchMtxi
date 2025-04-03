'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    static associate(models) {
      // A Route can be linked to Orders and Drivers.
      Route.hasMany(models.Order, {
        foreignKey: 'route_id', // Match the Order model and database
        as: 'orders'
      });
      Route.hasMany(models.Driver, {
        foreignKey: 'active_route_id', // Match the Driver model and database
        as: 'drivers'
      });
      Route.belongsTo(models.Ride, {
        foreignKey: 'rideId',
        as: 'ride' // Added association to Ride
      });
    }
  }
  Route.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    origin: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    destination: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    waypoints: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    distance: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    duration: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    polyline: {
      type: DataTypes.STRING,
      allowNull: true
    },
    steps: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    trafficModel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rideId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'rides',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      field: 'ride_id', // Added rideId field
    }
  }, {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    underscored: true,
    indexes: [
      {
        fields: ['origin', 'destination']
      }
    ],
    scopes: {
      active: {
        where: sequelize.literal(`"routes"."created_at" >= NOW() - INTERVAL '24 hours'`)
      }
    }
  });
  return Route;
};
