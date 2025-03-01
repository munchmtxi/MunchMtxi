// src/models/branchRole.js

'use strict';
const { Model } = require('sequelize');

const BRANCH_PERMISSIONS = {
  MANAGE_STAFF: 'manage_staff',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_ANALYTICS: 'view_analytics',
  PROCESS_PAYMENTS: 'process_payments',
  MANAGE_BOOKINGS: 'manage_bookings',
  HANDLE_REFUNDS: 'handle_refunds',
  VIEW_REPORTS: 'view_reports',
  MANAGE_PROMOTIONS: 'manage_promotions',
  MANAGE_TABLES: 'manage_tables'
};

const BRANCH_ROLES = {
  BRANCH_MANAGER: {
    name: 'branch_manager',
    permissions: Object.values(BRANCH_PERMISSIONS),
    description: 'Full access to branch management'
  },
  SHIFT_SUPERVISOR: {
    name: 'shift_supervisor',
    permissions: [
      BRANCH_PERMISSIONS.MANAGE_ORDERS,
      BRANCH_PERMISSIONS.MANAGE_INVENTORY,
      BRANCH_PERMISSIONS.PROCESS_PAYMENTS,
      BRANCH_PERMISSIONS.VIEW_REPORTS,
      BRANCH_PERMISSIONS.MANAGE_TABLES
    ],
    description: 'Supervise daily operations and staff'
  },
  CASHIER: {
    name: 'cashier',
    permissions: [
      BRANCH_PERMISSIONS.PROCESS_PAYMENTS,
      BRANCH_PERMISSIONS.MANAGE_ORDERS
    ],
    description: 'Handle payments and basic orders'
  },
  INVENTORY_MANAGER: {
    name: 'inventory_manager',
    permissions: [
      BRANCH_PERMISSIONS.MANAGE_INVENTORY,
      BRANCH_PERMISSIONS.VIEW_REPORTS
    ],
    description: 'Manage branch inventory and stock'
  }
};

module.exports = (sequelize, DataTypes) => {
  class BranchRole extends Model {
    static associate(models) {
      this.hasMany(models.BranchStaffRole, {
        foreignKey: 'role_id',
        as: 'staffAssignments'
      });
      
      this.belongsTo(models.MerchantBranch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }

    // Check if role has specific permission
    hasPermission(permission) {
      const roleConfig = BRANCH_ROLES[this.name];
      return roleConfig && roleConfig.permissions.includes(permission);
    }

    // Get all permissions for role
    getAllPermissions() {
      const roleConfig = BRANCH_ROLES[this.name];
      return roleConfig ? roleConfig.permissions : [];
    }
  }

  BranchRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [Object.keys(BRANCH_ROLES)]
      }
    },
    custom_permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidPermissions(value) {
          if (!value) return;
          
          const invalidPermissions = value.filter(
            perm => !Object.values(BRANCH_PERMISSIONS).includes(perm)
          );
          
          if (invalidPermissions.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    modelName: 'BranchRole',
    tableName: 'branch_roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['branch_id', 'name']
      }
    ]
  });

  // Export constants with model
  BranchRole.PERMISSIONS = BRANCH_PERMISSIONS;
  BranchRole.ROLES = BRANCH_ROLES;

  return BranchRole;
};