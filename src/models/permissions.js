'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      this.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
      });
      this.belongsToMany(models.Staff, {
        through: models.StaffPermissions,
        foreignKey: 'permission_id',
        otherKey: 'staff_id',
        as: 'staff',
      });
    }
  }

  Permission.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'action', 'resource'],
        name: 'unique_role_action_resource'
      }
    ]
  });

  return Permission;
};