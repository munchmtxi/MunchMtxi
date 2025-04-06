'use strict';

const setupStaffDriverCoordinationRoutes = require('@routes/staff/staffDriverCoordinationRoutes');
const { logger } = require('@utils/logger');

const setupStaffDriverCoordination = (app) => {
  setupStaffDriverCoordinationRoutes(app);
  logger.info('Staff driver coordination setup completed');
};

module.exports = setupStaffDriverCoordination;