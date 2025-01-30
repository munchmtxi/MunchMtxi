// test/helpers/serverSetup.js
const http = require('http');
const { setupSocket } = require('../../src/config/socket');
const { sequelize } = require('../../src/models');

const setupTestServer = async () => {
  // Create HTTP server
  const server = http.createServer();
  
  // Setup Socket.IO
  const io = setupSocket(server);
  
  // Start server on random port
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;

  return {
    server,
    io,
    url
  };
};

// test/helpers/testData.js
const { User, Driver, Merchant } = require('../../src/models');

const createTestUser = async () => {
  return await User.create({
    name: 'Test User',
    email: 'test@example.com',
    role: 'CUSTOMER',
    password: 'testpass'
  });
};

const createTestDriver = async () => {
  return await Driver.create({
    name: 'Test Driver',
    email: 'driver@example.com',
    phoneNumber: '+1234567890',
    vehicleInfo: {
      type: 'CAR',
      plate: 'TEST123'
    }
  });
};

const createTestMerchant = async () => {
  return await Merchant.create({
    name: 'Test Merchant',
    email: 'merchant@example.com',
    businessName: 'Test Restaurant',
    businessType: 'RESTAURANT'
  });
};

module.exports = {
  setupTestServer,
  createTestUser,
  createTestDriver,
  createTestMerchant
};