'use strict';

const feedbackRoutes = require('@routes/customer/feedbackRoutes');

module.exports = (app, io) => {
  // Middleware to attach io to req
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Mount feedback routes
  app.use('/api/customer/feedback', feedbackRoutes);

  console.log('Feedback routes initialized');
};