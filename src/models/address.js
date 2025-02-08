'use strict';
const { Model, Op } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      // A customer may reference an address as their default address.
      Address.hasMany(models.Customer, {
        foreignKey: 'defaultAddressId',
        as: 'customers'
      });
    }
  }
  Address.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    formattedAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    placeId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    components: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    countryCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    underscored: true,
    indexes: [
      {
        fields: ['placeId']
      },
      {
        fields: ['latitude', 'longitude']
      }
    ],
    scopes: {
      validated: {
        where: {
          validatedAt: { [Op.ne]: null }
        }
      }
    },
    hooks: {
      beforeValidate: (address) => {
        if (address.components && typeof address.components !== 'string') {
          address.components = JSON.stringify(address.components);
        }
      }
    }
  });
  return Address;
};
