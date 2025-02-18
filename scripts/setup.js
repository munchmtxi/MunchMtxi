// scripts/setup.js
const fs = require('fs').promises;
const path = require('path');

const directories = [
  'config',
  'controllers',
  'models',
  'routes',
  'utils',
  'services',
  'middleware',
  'validators',
  'handlers'
];

const basicIndexContent = `// Basic export for directory initialization
module.exports = {};
`;

async function setupDirectories() {
  const srcPath = path.join(process.cwd(), 'src');
  
  // Ensure src directory exists
  try {
    await fs.access(srcPath);
  } catch (error) {
    await fs.mkdir(srcPath);
    console.log('Created src directory');
  }

  // Create each directory and add index.js
  for (const dir of directories) {
    const dirPath = path.join(srcPath, dir);
    const indexPath = path.join(dirPath, 'index.js');

    try {
      // Check if directory exists
      await fs.access(dirPath);
      console.log(`✓ Directory exists: ${dir}`);
    } catch (error) {
      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }

    try {
      // Check if index.js exists
      await fs.access(indexPath);
      console.log(`✓ index.js exists in ${dir}`);
    } catch (error) {
      // Create index.js if it doesn't exist
      await fs.writeFile(indexPath, basicIndexContent);
      console.log(`Created index.js in ${dir}`);
    }
  }
}

// Run setup
setupDirectories()
  .then(() => {
    console.log('\nSetup completed successfully! ✨');
  })
  .catch((error) => {
    console.error('Error during setup:', error);
    process.exit(1);
  });