/**
 * @module utils/pathHelper
 * @description Provides utility functions for handling and validating project paths.
 */
const path = require('path');
const fs = require('fs');

/**
 * Retrieves the project's root directory.
 *
 * @function getProjectRoot
 * @returns {string} The absolute path to the project's root directory.
 */
function getProjectRoot() {
  return path.resolve(__dirname, '../..');
}

/**
 * Resolves a full path within the project directory by joining the project root with the provided path segments.
 *
 * @function resolveProjectPath
 * @param {...string} paths - One or more path segments to join with the project root.
 * @returns {string} The resolved absolute path within the project.
 */
function resolveProjectPath(...paths) {
  return path.join(getProjectRoot(), ...paths);
}

/**
 * Validates whether the specified path exists.
 *
 * @function validatePath
 * @param {string} pathToCheck - The path to validate.
 * @returns {boolean} Returns true if the path exists; otherwise, false.
 */
function validatePath(pathToCheck) {
  try {
    fs.accessSync(pathToCheck, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes the given path, resolving '..' and '.' segments.
 *
 * @function normalizePath
 * @param {string} targetPath - The path to normalize.
 * @returns {string} The normalized path.
 */
function normalizePath(targetPath) {
  return path.normalize(targetPath);
}

/**
 * Checks whether the specified path is a directory.
 *
 * @function isDirectory
 * @param {string} targetPath - The path to check.
 * @returns {boolean} True if the path is a directory, otherwise false.
 */
function isDirectory(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Checks whether the specified path is a file.
 *
 * @function isFile
 * @param {string} targetPath - The path to check.
 * @returns {boolean} True if the path is a file, otherwise false.
 */
function isFile(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    return stat.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Ensures that the specified directory exists. Creates it if it does not.
 *
 * @function ensureDirectoryExists
 * @param {string} targetPath - The directory path to ensure.
 * @returns {Promise<void>} Resolves when the directory exists.
 */
async function ensureDirectoryExists(targetPath) {
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to ensure directory exists: ${error.message}`);
  }
}

/**
 * Returns the base name of a file from a full path.
 *
 * @function getBaseName
 * @param {string} targetPath - The full file path.
 * @returns {string} The base name of the file.
 */
function getBaseName(targetPath) {
  return path.basename(targetPath);
}

/**
 * Returns the file extension from a full path.
 *
 * @function getFileExtension
 * @param {string} targetPath - The full file path.
 * @returns {string} The file extension.
 */
function getFileExtension(targetPath) {
  return path.extname(targetPath);
}

module.exports = {
  getProjectRoot,
  resolveProjectPath,
  validatePath,
  normalizePath,
  isDirectory,
  isFile,
  ensureDirectoryExists,
  getBaseName,
  getFileExtension
};
