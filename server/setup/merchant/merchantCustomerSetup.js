'use strict';

const merchantCustomerRoutes = require('@routes/merchant/merchantCustomerRoutes');
const { logger } = require('@utils/logger');

module.exports = (app, io) => {
  app.use('/api/v1/merchants/:merchantId/customer', (req, res, next) => {
    logger.info('Before mounting merchantCustomerRoutes', { params: req.params }); // Should show {"merchantId": "36"}
    next();
  }, merchantCustomerRoutes(io));
  logger.info('Merchant customer routes mounted');
};