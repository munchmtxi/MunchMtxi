// scripts/enhancedStart.js
const path = require('path');
const moduleAlias = require('module-alias');
const colors = require('colors/safe');

// First, create the aliases configuration
const aliases = {
  '@config': path.join(__dirname, '..', 'src', 'config'),
  '@controllers': path.join(__dirname, '..', 'src', 'controllers'),
  '@models': path.join(__dirname, '..', 'src', 'models'),
  '@routes': path.join(__dirname, '..', 'src', 'routes'),
  '@utils': path.join(__dirname, '..', 'src', 'utils'),
  '@services': path.join(__dirname, '..', 'src', 'services'),
  '@middleware': path.join(__dirname, '..', 'src', 'middleware'),
  '@validators': path.join(__dirname, '..', 'src', 'validators'),
  '@handlers': path.join(__dirname, '..', 'src', 'handlers')
};

// Register aliases
moduleAlias.addAliases(aliases);

// Load environment variables
require('dotenv').config();

// Now require the validator
const validator = require('./validateStartup');

async function start() {
  try {
    // Display registered aliases
    console.log('\n🔗 Module aliases registered:');
    Object.entries(aliases).forEach(([alias, pathValue]) => {
      console.log(`   ${colors.green('✓')} ${alias} → ${pathValue}`);
    });

    console.log('\n🌱 Environment variables loaded');

    // Run core validations
    const isValid = await validator.validateAll();

    if (!isValid) {
      console.error(colors.red('\n❌ Application failed validation. Please fix the errors above.'));
      process.exit(1);
    }

    // Start the server if all validations pass
    console.log(colors.green('\n✨ All validations passed. Starting server...'));
    require('../server');

  } catch (error) {
    console.error(colors.red('\n❌ Failed to start server:'), error.message);
    process.exit(1);
  }
}

// Enhanced error handling
process.on('unhandledRejection', (reason) => {
  console.error(colors.red('\n❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colors.red('\n❌ Uncaught Exception:'), error);
  process.exit(1);
});

// Start the application
start();