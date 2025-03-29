// server/setup/customer/orderSetup.js
const cron = require('node-cron');
const OrderService = require('@services/customer/orderService');
const { logger } = require('@utils/logger');

const orderRoutes = require('@routes/customer/orderRoutes');

const setupOrder = (app) => {
  // Register order routes
  app.use('/api/customer', orderRoutes);
  logger.info('Customer order routes registered');

  // Schedule feedback request for completed orders (runs every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const completedOrders = await OrderService.Order.findAll({
        where: { status: 'completed', actual_delivery_time: { [Op.ne]: null } },
        attributes: ['id'],
      });

      for (const order of completedOrders) {
        // Check if feedback was already requested (you might need a flag in the Order model)
        await OrderService.requestFeedback(order.id);
        logger.info(`Feedback requested for order ${order.id}`);
      }
    } catch (error) {
      logger.error('Error in feedback request cron job', { error: error.message });
    }
  });

  logger.info('Order feedback cron job scheduled');
};

module.exports = setupOrder;