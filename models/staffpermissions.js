// models/staffpermissions.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaffPermissions extends Model {
    static associate(models) {
      // Associations are defined in Permission and Staff models
    }
  }

  StaffPermissions.init({
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Staff',
        key: 'id',
      },
      primaryKey: true,
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Permissions',
        key: 'id',
      },
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'StaffPermissions',
    timestamps: false,
    paranoid: false,
  });

  return StaffPermissions;
};
