// src/utils/pathHelper.js
const path = require('path');
const fs = require('fs');

function getProjectRoot() {
    return path.resolve(__dirname, '../..');
}

function resolveProjectPath(...paths) {
    return path.join(getProjectRoot(), ...paths);
}

function validatePath(pathToCheck) {
    try {
        fs.accessSync(pathToCheck);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    getProjectRoot,
    resolveProjectPath,
    validatePath
};