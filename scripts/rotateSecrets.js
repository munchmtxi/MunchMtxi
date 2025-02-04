require('module-alias/register');
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { logger } = require('@utils/logger');

async function generateNewSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

async function updateEnvFile(key, newValue) {
  const envPath = path.join(__dirname, '../.env');
  const envContent = await fs.readFile(envPath, 'utf-8');
  
  const updatedContent = envContent.replace(
    new RegExp(`^${key}=.*$`, 'm'),
    `${key}=${newValue}`
  );
  
  await fs.writeFile(envPath, updatedContent);
}

async function rotateSecrets() {
  try {
    logger.info('Starting secret rotation...');

    // Generate new secrets
    const newJwtSecret = await generateNewSecret();
    const newRefreshSecret = await generateNewSecret();
    const newSessionSecret = await generateNewSecret();

    // Update .env file
    await updateEnvFile('JWT_SECRET', newJwtSecret);
    await updateEnvFile('JWT_REFRESH_SECRET', newRefreshSecret);
    await updateEnvFile('SESSION_SECRET', newSessionSecret);

    logger.info('Secrets rotated successfully');
    logger.info('Please restart your application for the changes to take effect');
  } catch (error) {
    logger.error(`Secret rotation failed: ${error.message}`);
    process.exit(1);
  }
}

rotateSecrets();//