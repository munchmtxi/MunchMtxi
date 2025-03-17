// src/setup/server/branchProfileSecuritySetup.js
'use strict';
const branchProfileSecurityRoutes = require('@routes/merchant/branch/branchProfileSecurityRoutes');
const { logger } = require('@utils/logger');

const setupBranchProfileSecurity = (app) => {
  logger.info('Setting up branch profile security routes...');
  
  // Mount the branch profile security routes
  app.use('/api/v1/merchant/branches/security', branchProfileSecurityRoutes);
  
  logger.info('Branch profile security routes mounted successfully');
};

module.exports = setupBranchProfileSecurity;