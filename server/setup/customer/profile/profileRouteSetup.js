'use strict';
const profileRoutes = require('@routes/customer/profile/profileRoutes');

const setupProfileRoutes = (app) => {
  app.use('/api/customer/profile', profileRoutes);
};

module.exports = { setupProfileRoutes };