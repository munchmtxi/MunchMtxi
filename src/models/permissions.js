// models/permission.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      this.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'role',
      });
      this.belongsToMany(models.Staff, {
        through: models.StaffPermissions,
        foreignKey: 'permissionId',
        otherKey: 'staffId',
        as: 'staff',
      });
    }
  }

  Permission.init({
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Action is required' },
      },
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Resource is required' },
      },
    },
  }, {
    sequelize,
    modelName: 'Permission',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['roleId', 'action', 'resource'],
      },
    ],
  });

  return Permission;
};
