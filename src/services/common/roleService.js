'use strict';
const { Role, Permission } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

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
  const permissions = await Permission.findAll({ where: { role_id: roleId } }); // Changed from roleId to role_id
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

/**
 * Retrieves a role by ID.
 * @param {Number} roleId - ID of the role.
 * @returns {Object} - Role object with name.
 */
const getRoleById = async (roleId) => {
  try {
    const role = await Role.findByPk(roleId, {
      attributes: ['id', 'name'],
      paranoid: true, // Respect soft deletes
    });
    if (!role) {
      logger.warn('Role not found', { roleId });
      throw new AppError('Role not found', 404);
    }
    logger.info('Role fetched', { roleId, name: role.name });
    return { name: role.name };
  } catch (error) {
    logger.error('Error fetching role by ID', { error: error.message, roleId });
    throw error;
  }
};

module.exports = {
  createRole,
  getRolePermissions,
  updateRolePermissions,
  deleteRole,
  getRoleById,
};