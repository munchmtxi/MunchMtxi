'use strict';

const { logger } = require('@utils/logger');

module.exports = (app, io, whatsappService, emailService, smsService) => {
  const staffCustomerRoutes = require('@routes/staff/staffCustomerRoutes')(io, whatsappService, emailService, smsService);

  app.use('/api/v1/staff/customer', staffCustomerRoutes);
  logger.info('Staff customer routes mounted at /api/v1/staff/customer');
};