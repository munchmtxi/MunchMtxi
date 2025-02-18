// scripts/enhancedStart.js
const path = require('path');
const moduleAlias = require('module-alias');

// Reset any existing aliases
moduleAlias.reset();

// Define the base directory for your source code
const baseDir = path.join(__dirname, '..');

// Register module aliases with absolute paths
moduleAlias.addAliases({
  '@config': path.join(baseDir, 'src', 'config'),
  '@controllers': path.join(baseDir, 'src', 'controllers'),
  '@models': path.join(baseDir, 'src', 'models'),
  '@routes': path.join(baseDir, 'src', 'routes'),
  '@utils': path.join(baseDir, 'src', 'utils'),
  '@services': path.join(baseDir, 'src', 'services'),
  '@middleware': path.join(baseDir, 'src', 'middleware'),
  '@validators': path.join(baseDir, 'src', 'validators'),
  '@handlers': path.join(baseDir, 'src', 'handlers')
});

console.log('\n🔗 Module aliases registered successfully.');

// Load environment variables after aliases are set up
require('dotenv').config();
console.log('\n🌱 Environment variables loaded.');

// Now require the validator and other dependencies
const validator = require('./validateStartup');
const { logger } = require('@utils/logger');

async function start() {
  console.log('\n🔍 Validating application modules...');

  try {
    // Run the connection tests
    console.log('\n⚡ Running connection tests...');
    require('./testConnections');

    // Validate all modules, including new validations for database, migrations, integrations, etc.
    const isValid = await validator.validateAll();

    if (!isValid) {
      console.error('\n❌ Application failed to validate. Please fix the errors above.');
      process.exit(1);
    }

    // If everything is valid, start the server
    console.log('\n🚀 All modules validated. Starting server...');
    require('../server');

  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('\n❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});

start();
