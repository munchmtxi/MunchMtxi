'use strict';

const setupAvailabilityRoutes = require('@routes/staff/availabilityRoutes');
const { logger } = require('@utils/logger');

const setupStaffAvailability = (app) => {
  setupAvailabilityRoutes(app);
  logger.info('Staff availability routes mounted at /api/v1/staff');
};

module.exports = setupStaffAvailability;