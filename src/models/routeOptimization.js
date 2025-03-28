'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RouteOptimization extends Model {
    static associate(models) {
      // Define associations if necessary.
    }
  }
  RouteOptimization.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    totalDistance: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    totalDuration: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    optimizedOrder: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    polyline: {
      type: DataTypes.STRING,
      allowNull: true
    },
    driverLocation: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    deliveryIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RouteOptimization',
    tableName: 'route_optimizations',
    underscored: false,
    indexes: [
      { fields: ['created_at'] }
    ]
  });
  return RouteOptimization;
};
