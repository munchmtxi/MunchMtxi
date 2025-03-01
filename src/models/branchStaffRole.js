// src/models/branchStaffRole.js

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchStaffRole extends Model {
    static associate(models) {
      this.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
      
      this.belongsTo(models.BranchRole, {
        foreignKey: 'role_id',
        as: 'role'
      });

      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }
  }

  BranchStaffRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branch_roles',
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
    custom_permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidPermissions(value) {
          if (!value) return;
          const { PERMISSIONS } = require('./branchRole');
          
          const invalidPermissions = value.filter(
            perm => !Object.values(PERMISSIONS).includes(perm)
          );
          
          if (invalidPermissions.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          }
        }
      }
    },
    assigned_by: {
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
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true
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
    modelName: 'BranchStaffRole',
    tableName: 'branch_staff_roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['staff_id', 'branch_id', 'role_id'],
        where: {
          is_active: true
        }
      },
      {
        fields: ['valid_from', 'valid_until']
      }
    ],
    hooks: {
      beforeCreate: async (staffRole) => {
        // Ensure only one active role per staff per branch
        const existingRole = await BranchStaffRole.findOne({
          where: {
            staff_id: staffRole.staff_id,
            branch_id: staffRole.branch_id,
            is_active: true
          }
        });

        if (existingRole) {
          await existingRole.update({ 
            is_active: false,
            valid_until: new Date()
          });
        }
      }
    }
  });

  return BranchStaffRole;
};