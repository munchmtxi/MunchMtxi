'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaffPermissions extends Model {
    static associate(models) {
      // Associations are defined in Permission and Staff models
    }
  }

  StaffPermissions.init({
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      primaryKey: true,
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'StaffPermissions',
    tableName: 'staff_permissions',
    underscored: true,
    timestamps: false,
    paranoid: false,
  });

  return StaffPermissions;
};