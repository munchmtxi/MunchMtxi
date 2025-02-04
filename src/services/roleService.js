// src/services/roleService.js
const { Role, Permission } = require('@models');
const AppError = require('@utils/AppError');

/**
 * Creates a new role with associated permissions.
 * @param {String} roleName - Name of the role.
 * @param {Array} permissions - Array of permissions (each with action and resource).
 * @returns {Object} - Created role.
 */
const createRole = async (roleName, permissions) => {
  const role = await Role.create({ name: roleName });
  const permissionRecords = permissions.map(permission => ({
    roleId: role.id,
    action: permission.action,
    resource: permission.resource,
  }));
  await Permission.bulkCreate(permissionRecords);
  return role;
};

/**
 * Retrieves permissions for a given role.
 * @param {Number} roleId - ID of the role.
 * @returns {Array} - Array of permissions.
 */
const getRolePermissions = async (roleId) => {
  const permissions = await Permission.findAll({ where: { roleId } });
  return permissions;
};

/**
 * Updates permissions for a given role.
 * @param {Number} roleId - ID of the role.
 * @param {Array} permissions - New array of permissions.
 */
const updateRolePermissions = async (roleId, permissions) => {
  await Permission.destroy({ where: { roleId } });
  const permissionRecords = permissions.map(permission => ({
    roleId,
    action: permission.action,
    resource: permission.resource,
  }));
  await Permission.bulkCreate(permissionRecords);
};

/**
 * Deletes a role and its associated permissions.
 * @param {Number} roleId - ID of the role.
 */
const deleteRole = async (roleId) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role not found', 404);
  await role.destroy();
};

module.exports = { createRole, getRolePermissions, updateRolePermissions, deleteRole };
