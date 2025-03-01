// src/models/branchPermission.js

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchPermission extends Model {
    static associate(models) {
      this.belongsTo(models.BranchStaffRole, {
        foreignKey: 'staff_role_id',
        as: 'staffRole'
      });

      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }
  }

  BranchPermission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    staff_role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branch_staff_roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidPermission(value) {
          const { PERMISSIONS } = require('./branchRole');
          if (!Object.values(PERMISSIONS).includes(value)) {
            throw new Error('Invalid permission');
          }
        }
      }
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional conditions/restrictions for the permission'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BranchPermission',
    tableName: 'branch_permissions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['staff_role_id', 'permission'],
        unique: true,
        where: {
          is_active: true
        }
      },
      {
        fields: ['branch_id']
      }
    ]
  });

  return BranchPermission;
};