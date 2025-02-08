'use strict';
const { Model, Op } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeliveryHotspot extends Model {
    static associate(models) {
      // Associations can be defined here if needed.
    }
  }
  DeliveryHotspot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    center: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    points: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    radius: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    popularTimes: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    nearbyPlaces: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    totalDeliveries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    timeframe: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DeliveryHotspot',
    tableName: 'delivery_hotspots',
    underscored: true,
    indexes: [
      {
        fields: ['timeframe']
      }
    ],
    scopes: {
      active: {
        where: {
          totalDeliveries: { [Op.gt]: 0 }
        }
      }
    }
  });
  return DeliveryHotspot;
};
