'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Geofence extends Model {
    static associate(models) {
      // Merchants and Staff can be linked to a Geofence.
      Geofence.hasMany(models.Merchant, {
        foreignKey: 'geofenceId',
        as: 'merchants'
      });
      Geofence.hasMany(models.Staff, {
        foreignKey: 'geofenceId',
        as: 'staff'
      });
      Geofence.hasMany(models.GeofenceEvent, {
        foreignKey: 'geofenceId',
        as: 'events'
      });
    }
  }
  Geofence.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    center: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    area: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Geofence',
    tableName: 'geofences',
    underscored: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['active']
      }
    ],
    scopes: {
      active: {
        where: { active: true }
      }
    },
    hooks: {
      beforeValidate: (geofence) => {
        if (!geofence.coordinates || !geofence.center) {
          throw new Error("Coordinates and center are required for Geofence validation.");
        }
      }
    }
  });
  return Geofence;
};
