// src/config/registerAliases.js
const moduleAlias = require('module-alias');
const path = require('path');

// Register module aliases
moduleAlias.addAliases({
  '@config': path.join(__dirname, '..', 'config'),
  '@controllers': path.join(__dirname, '..', 'controllers'),
  '@models': path.join(__dirname, '..', 'models'),
  '@routes': path.join(__dirname, '..', 'routes'),
  '@utils': path.join(__dirname, '..', 'utils'),
  '@services': path.join(__dirname, '..', 'services'),
  '@middleware': path.join(__dirname, '..', 'middleware'),
  '@validators': path.join(__dirname, '..', 'validators'),
  '@handlers': path.join(__dirname, '..', 'handlers')
});

module.exports = moduleAlias;