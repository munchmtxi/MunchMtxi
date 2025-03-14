// src/services/merchantServices/branchProfileServices/branchAccessService.js

const { 
    BranchRole, 
    BranchStaffRole, 
    BranchPermission, 
    Staff, 
    MerchantBranch,
    sequelize 
  } = require('@models');
  const AppError = require('@utils/AppError');
  const eventManager = require('@services/eventManager');
  const logger = require('@utils/logger');
  
  class BranchAccessService {
    /**
     * Create a new branch role
     * @param {number} branchId - Branch ID
     * @param {string} roleName - Role name from BRANCH_ROLES
     * @param {Array} customPermissions - Optional custom permissions
     * @returns {Promise<BranchRole>}
     */
    async createRole(branchId, roleName, customPermissions = null) {
      const transaction = await sequelize.transaction();
  
      try {
        // Validate role exists in predefined roles
        if (!BranchRole.ROLES[roleName]) {
          throw new AppError(`Invalid role: ${roleName}`, 400);
        }
  
        // Validate custom permissions if provided
        if (customPermissions) {
          const invalidPermissions = customPermissions.filter(
            perm => !Object.values(BranchRole.PERMISSIONS).includes(perm)
          );
          if (invalidPermissions.length > 0) {
            throw new AppError(`Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
          }
        }
  
        // Create role
        const role = await BranchRole.create({
          branch_id: branchId,
          name: roleName,
          custom_permissions: customPermissions
        }, { transaction });
  
        await transaction.commit();
  
        eventManager.emit('merchant.branch.role.created', {
          branchId,
          roleId: role.id,
          roleName
        });
  
        return role;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Assign role to staff member
     * @param {number} branchId - Branch ID
     * @param {number} staffId - Staff ID
     * @param {number} roleId - Role ID
     * @param {number} assignedBy - User ID of assigner
     * @param {Object} options - Additional options (validUntil, customPermissions)
     * @returns {Promise<BranchStaffRole>}
     */
    async assignRoleToStaff(branchId, staffId, roleId, assignedBy, options = {}) {
      const transaction = await sequelize.transaction();
  
      try {
        // Verify branch exists
        const branch = await MerchantBranch.findByPk(branchId);
        if (!branch) {
          throw new AppError('Branch not found', 404);
        }
  
        // Verify staff exists and belongs to merchant
        const staff = await Staff.findOne({
          where: { 
            id: staffId,
            merchant_id: branch.merchant_id
          }
        });
        if (!staff) {
          throw new AppError('Staff not found or not associated with merchant', 404);
        }
  
        // Verify role exists and belongs to branch
        const role = await BranchRole.findOne({
          where: {
            id: roleId,
            branch_id: branchId,
            is_active: true
          }
        });
        if (!role) {
          throw new AppError('Role not found or inactive', 404);
        }
  
        // Create staff role assignment
        const staffRole = await BranchStaffRole.create({
          staff_id: staffId,
          role_id: roleId,
          branch_id: branchId,
          assigned_by: assignedBy,
          custom_permissions: options.customPermissions,
          valid_until: options.validUntil
        }, { transaction });
  
        // Create default permissions based on role
        const roleConfig = BranchRole.ROLES[role.name];
        await Promise.all(roleConfig.permissions.map(permission =>
          BranchPermission.create({
            staff_role_id: staffRole.id,
            branch_id: branchId,
            permission,
            granted_by: assignedBy
          }, { transaction })
        ));
  
        await transaction.commit();
  
        eventManager.emit('merchant.branch.staff.role_assigned', {
          branchId,
          staffId,
          roleId,
          staffRoleId: staffRole.id
        });
  
        return staffRole;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Revoke staff role
     * @param {number} staffRoleId - Staff role assignment ID
     * @param {number} revokedBy - User ID of revoker
     * @returns {Promise<boolean>}
     */
    async revokeStaffRole(staffRoleId, revokedBy) {
      const transaction = await sequelize.transaction();
  
      try {
        const staffRole = await BranchStaffRole.findByPk(staffRoleId, {
          include: [
            {
              model: BranchPermission,
              as: 'permissions',
              where: { is_active: true }
            }
          ]
        });
  
        if (!staffRole) {
          throw new AppError('Staff role assignment not found', 404);
        }
  
        // Deactivate role assignment
        await staffRole.update({
          is_active: false,
          valid_until: new Date(),
          updated_at: new Date()
        }, { transaction });
  
        // Deactivate all associated permissions
        await Promise.all(staffRole.permissions.map(permission =>
          permission.update({
            is_active: false,
            updated_at: new Date()
          }, { transaction })
        ));
  
        await transaction.commit();
  
        eventManager.emit('merchant.branch.staff.role_revoked', {
          branchId: staffRole.branch_id,
          staffId: staffRole.staff_id,
          roleId: staffRole.role_id,
          staffRoleId: staffRole.id,
          revokedBy
        });
  
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Check if staff has specific permission
     * @param {number} staffId 
     * @param {number} branchId 
     * @param {string} permission 
     * @returns {Promise<boolean>}
     */
    async hasPermission(staffId, branchId, permission) {
      try {
        const staffRole = await BranchStaffRole.findOne({
          where: {
            staff_id: staffId,
            branch_id: branchId,
            is_active: true
          },
          include: [
            {
              model: BranchPermission,
              as: 'permissions',
              where: {
                permission,
                is_active: true
              }
            }
          ]
        });
  
        return !!staffRole;
      } catch (error) {
        logger.error('Error checking staff permission:', error);
        return false;
      }
    }
  
    /**
     * Get all active roles for a branch
     * @param {number} branchId 
     * @returns {Promise<Array<BranchRole>>}
     */
    async getBranchRoles(branchId) {
      return BranchRole.findAll({
        where: {
          branch_id: branchId,
          is_active: true
        }
      });
    }
  
    /**
     * Get staff member's active roles across all branches
     * @param {number} staffId 
     * @returns {Promise<Array<BranchStaffRole>>}
     */
    async getStaffRoles(staffId) {
      return BranchStaffRole.findAll({
        where: {
          staff_id: staffId,
          is_active: true
        },
        include: [
          {
            model: BranchRole,
            as: 'role'
          },
          {
            model: MerchantBranch,
            as: 'branch'
          }
        ]
      });
    }
  
    /**
     * Add custom permission to staff role
     * @param {number} staffRoleId 
     * @param {string} permission 
     * @param {number} grantedBy 
     * @param {Object} conditions 
     * @returns {Promise<BranchPermission>}
     */
    async addCustomPermission(staffRoleId, permission, grantedBy, conditions = null) {
      const transaction = await sequelize.transaction();
  
      try {
        // Validate permission
        if (!Object.values(BranchRole.PERMISSIONS).includes(permission)) {
          throw new AppError('Invalid permission', 400);
        }
  
        const staffRole = await BranchStaffRole.findByPk(staffRoleId);
        if (!staffRole) {
          throw new AppError('Staff role not found', 404);
        }
  
        const newPermission = await BranchPermission.create({
          staff_role_id: staffRoleId,
          branch_id: staffRole.branch_id,
          permission,
          granted_by: grantedBy,
          conditions
        }, { transaction });
  
        await transaction.commit();
  
        eventManager.emit('merchant.branch.permission.added', {
          staffRoleId,
          permission,
          permissionId: newPermission.id
        });
  
        return newPermission;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    /**
     * Remove custom permission from staff role
     * @param {number} permissionId 
     * @param {number} revokedBy 
     * @returns {Promise<boolean>}
     */
    async removeCustomPermission(permissionId, revokedBy) {
      const permission = await BranchPermission.findByPk(permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404);
      }
  
      await permission.update({
        is_active: false,
        updated_at: new Date()
      });
  
      eventManager.emit('merchant.branch.permission.removed', {
        permissionId,
        staffRoleId: permission.staff_role_id,
        revokedBy
      });
  
      return true;
    }
  
    /**
     * Get staff permissions for branch
     * @param {number} staffId 
     * @param {number} branchId 
     * @returns {Promise<Array<string>>}
     */
    async getStaffPermissions(staffId, branchId) {
      const staffRole = await BranchStaffRole.findOne({
        where: {
          staff_id: staffId,
          branch_id: branchId,
          is_active: true
        },
        include: [
          {
            model: BranchPermission,
            as: 'permissions',
            where: { is_active: true }
          }
        ]
      });
  
      if (!staffRole) {
        return [];
      }
  
      return staffRole.permissions.map(p => p.permission);
    }
  }
  
  module.exports = new BranchAccessService();