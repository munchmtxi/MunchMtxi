'use strict';
const { Model, Sequelize } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    static associate(models) {
      // A Route can be linked to Orders and Drivers.
      Route.hasMany(models.Order, {
        foreignKey: 'routeId',
        as: 'orders'
      });
      Route.hasMany(models.Driver, {
        foreignKey: 'activeRouteId',
        as: 'drivers'
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
        // Returns routes created in the last 24 hours.
        where: sequelize.literal(`"routes"."created_at" >= NOW() - INTERVAL '24 hours'`)
      }
    }
  });
  return Route;
};
