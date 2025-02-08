'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GeofenceEvent extends Model {
    static associate(models) {
      GeofenceEvent.belongsTo(models.Geofence, {
        foreignKey: 'geofenceId',
        as: 'geofence'
      });
    }
  }
  GeofenceEvent.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    geofenceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'geofences',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GeofenceEvent',
    tableName: 'geofence_events',
    underscored: true,
    indexes: [
      { fields: ['geofenceId'] },
      { fields: ['eventType'] },
      { fields: ['created_at'] }
    ]
  });
  return GeofenceEvent;
};
