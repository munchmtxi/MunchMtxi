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
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Now require the validator
const StartupValidator = require('./validateStartup'); // Renamed to match export

async function start() {
  try {
    // Display registered aliases
    console.log('\n🔗 Module aliases registered:');
    Object.entries(aliases).forEach(([alias, pathValue]) => {
      console.log(`   ${colors.green('✓')} ${alias} → ${pathValue}`);
    });

    console.log('\n🌱 Environment variables loaded');

    // Run core validations
    console.log('\n🔍 Starting validation process...');
    const validator = StartupValidator; // Use the exported instance
    const isValid = await validator.validateAll();

    if (!isValid) {
      console.error(colors.red('\n❌ Application failed validation. Check errors above.'));
      process.exit(1);
    }

    // Start the server if all validations pass
    console.log(colors.green('\n✨ All validations passed. Starting server...'));
    require('../server'); // Assuming this is your server entry point

  } catch (error) {
    console.error(colors.red('\n❌ Failed to start server:'), error.stack); // Include stack trace
    process.exit(1);
  }
}

// Enhanced error handling
process.on('unhandledRejection', (reason) => {
  console.error(colors.red('\n❌ Unhandled Rejection:'), reason.stack || reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colors.red('\n❌ Uncaught Exception:'), error.stack);
  process.exit(1);
});

// Start the application
start();