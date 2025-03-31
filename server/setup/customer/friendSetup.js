'use strict';
const friendRoutes = require('@routes/customer/friendRoutes');

module.exports = (app, io) => {
  app.use('/api/v1/friends', friendRoutes(io));
  console.log('Friend routes initialized');
};