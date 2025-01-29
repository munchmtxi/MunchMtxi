// models/role.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      this.hasMany(models.User, {
        foreignKey: 'roleId',
        as: 'users',
      });
      this.hasMany(models.Permission, {
        foreignKey: 'roleId',
        as: 'permissions',
      });
    }
  }

  Role.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Role name is required' },
      },
    },
  }, {
    sequelize,
    modelName: 'Role',
    timestamps: true,
    paranoid: true,
  });

  return Role;
};
