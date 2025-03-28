'use strict';

const cartRoutes = require('@routes/customer/cartRoutes');

/**
 * Sets up cart-related routes for customers
 * @param {Express} app - The Express application instance
 */
const setupCartRoutes = (app) => {
  // Mount cart routes under /api/customer/cart
  app.use('/api/customer/cart', cartRoutes);
  console.log('Cart routes mounted at /api/customer/cart');
};

module.exports = setupCartRoutes;