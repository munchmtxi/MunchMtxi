'use strict';

const performanceIncentiveRoutes = require('@routes/staff/performanceIncentiveRoutes');

module.exports = (app, io) => {
  // Attach io to every request
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Mount performance incentive routes
  app.use('/api/staff/performance', performanceIncentiveRoutes);

  console.log('Performance incentive routes initialized');
};